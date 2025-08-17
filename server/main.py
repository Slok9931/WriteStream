from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
import json
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId
import ssl
import certifi

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_API_KEY = os.getenv("PINATA_SECRET_API_KEY")

# MongoDB connection with proper SSL handling
MONGODB_URL = os.getenv("MONGODB_URL")

# Global variables for MongoDB
client = None
db = None

# Enhanced connection strategies for production
def create_mongo_client():
    global client, db
    
    if not MONGODB_URL:
        raise Exception("MONGODB_URL environment variable not set")
    
    strategies = [
        # Strategy 1: Production-ready connection with certificates
        lambda: MongoClient(
            MONGODB_URL,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=30000,
            connectTimeoutMS=30000,
            socketTimeoutMS=30000,
            retryWrites=True,
            w='majority'
        ),
        
        # Strategy 2: Allow invalid certificates (for development/testing)
        lambda: MongoClient(
            MONGODB_URL,
            tls=True,
            tlsAllowInvalidCertificates=True,
            tlsInsecure=True,
            serverSelectionTimeoutMS=30000,
            connectTimeoutMS=30000,
            socketTimeoutMS=30000,
            retryWrites=True,
            w='majority'
        ),
        
        # Strategy 3: Basic connection with SSL disabled verification
        lambda: MongoClient(
            MONGODB_URL,
            ssl=True,
            ssl_cert_reqs=ssl.CERT_NONE,
            serverSelectionTimeoutMS=30000,
            connectTimeoutMS=30000,
            socketTimeoutMS=30000,
            retryWrites=True,
            w='majority'
        ),
        
        # Strategy 4: Minimal connection for debugging
        lambda: MongoClient(MONGODB_URL)
    ]
    
    for i, strategy in enumerate(strategies, 1):
        try:
            print(f"Trying MongoDB connection strategy {i}...")
            test_client = strategy()
            # Test the connection with a longer timeout
            test_client.admin.command('ping')
            print(f"MongoDB connected successfully with strategy {i}!")
            
            # Set global variables
            client = test_client
            db = client.writestream
            return test_client
        except Exception as e:
            print(f"Strategy {i} failed: {e}")
            continue
    
    raise Exception("All MongoDB connection strategies failed")

# Initialize MongoDB connection with retry logic
def initialize_mongodb():
    global client, db
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            print(f"MongoDB connection attempt {attempt + 1}/{max_retries}")
            create_mongo_client()
            print("MongoDB initialization successful!")
            return True
        except Exception as e:
            print(f"MongoDB initialization attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                print("All MongoDB connection attempts failed. Server will continue without database.")
                return False
            import time
            time.sleep(5)  # Wait 5 seconds before retry
    
    return False

def get_db():
    global client, db
    
    try:
        if client is None or db is None:
            print("MongoDB client not initialized, attempting to reconnect...")
            if not initialize_mongodb():
                raise HTTPException(status_code=500, detail="Database connection failed: MongoDB client not initialized")
        
        # Test connection
        client.admin.command('ping')
        return db
    except Exception as e:
        print(f"Database connection error: {e}")
        # Try to reconnect
        try:
            initialize_mongodb()
            if client and db:
                client.admin.command('ping')
                return db
        except:
            pass
        
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

# Health check endpoint
@app.get("/health")
async def health_check():
    try:
        db = get_db()
        return {"status": "healthy", "database": "connected"}
    except:
        return {"status": "unhealthy", "database": "disconnected"}

# Pydantic models
class UserProfile(BaseModel):
    wallet_address: str
    username: Optional[str] = None
    email: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

class ArticleReaction(BaseModel):
    article_id: int
    user_wallet: str
    reaction_type: str  # 'like' or 'dislike'

class FavoriteArticle(BaseModel):
    user_wallet: str
    article_id: int
    article_title: str

# Search endpoint
@app.get("/api/articles/search")
async def search_articles(query: str = Query(..., min_length=1)):
    try:
        db = get_db()
        favorites_collection = db.user_favorites
        
        # Search in article titles
        search_results = list(favorites_collection.find({
            "article_title": {"$regex": query, "$options": "i"}
        }).limit(50))
        
        for result in search_results:
            result["_id"] = str(result["_id"])
        
        return search_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Existing upload endpoint
@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    headers = {
        "pinata_api_key": PINATA_API_KEY,
        "pinata_secret_api_key": PINATA_SECRET_API_KEY,
    }

    files = {
        "file": (file.filename, await file.read())
    }

    response = requests.post(url, headers=headers, files=files)
    return response.json()

# User Profile endpoints
@app.post("/api/users/profile")
async def create_or_update_profile(profile: UserProfile):
    try:
        db = get_db()
        users_collection = db.users
        
        profile_data = {
            "wallet_address": profile.wallet_address,
            "username": profile.username,
            "email": profile.email,
            "bio": profile.bio,
            "avatar_url": profile.avatar_url,
            "updated_at": datetime.utcnow()
        }
        
        result = users_collection.update_one(
            {"wallet_address": profile.wallet_address},
            {"$set": profile_data, "$setOnInsert": {"created_at": datetime.utcnow()}},
            upsert=True
        )
        
        # Return the updated document
        updated_user = users_collection.find_one({"wallet_address": profile.wallet_address})
        updated_user["_id"] = str(updated_user["_id"])
        return updated_user
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users/profile/{wallet_address}")
async def get_user_profile(wallet_address: str):
    try:
        db = get_db()
        users_collection = db.users
        
        user = users_collection.find_one({"wallet_address": wallet_address})
        if user:
            user["_id"] = str(user["_id"])
            return user
        else:
            # Return default profile
            return {
                "wallet_address": wallet_address,
                "username": None,
                "email": None,
                "bio": None,
                "avatar_url": None,
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Article Analytics endpoints
@app.post("/api/articles/{article_id}/view")
async def record_article_view(article_id: int, user_wallet: str = Query(...)):
    try:
        db = get_db()
        views_collection = db.article_views
        analytics_collection = db.article_analytics
        
        # Record view if not already viewed by this user
        view_data = {
            "article_id": article_id,
            "user_wallet": user_wallet,
            "viewed_at": datetime.utcnow()
        }
        
        try:
            views_collection.insert_one(view_data)
            # Update analytics - increment view count
            analytics_collection.update_one(
                {"article_id": article_id},
                {"$inc": {"total_views": 1}, "$set": {"updated_at": datetime.utcnow()}},
                upsert=True
            )
        except DuplicateKeyError:
            # User already viewed this article
            pass
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/articles/react")
async def react_to_article(reaction: ArticleReaction):
    try:
        db = get_db()
        reactions_collection = db.article_reactions
        analytics_collection = db.article_analytics
        
        # Insert or update reaction
        reaction_data = {
            "article_id": reaction.article_id,
            "user_wallet": reaction.user_wallet,
            "reaction_type": reaction.reaction_type,
            "created_at": datetime.utcnow()
        }
        
        reactions_collection.update_one(
            {"article_id": reaction.article_id, "user_wallet": reaction.user_wallet},
            {"$set": reaction_data},
            upsert=True
        )
        
        # Calculate new counts
        likes_count = reactions_collection.count_documents({
            "article_id": reaction.article_id,
            "reaction_type": "like"
        })
        
        dislikes_count = reactions_collection.count_documents({
            "article_id": reaction.article_id,
            "reaction_type": "dislike"
        })
        
        # Update analytics
        analytics_collection.update_one(
            {"article_id": reaction.article_id},
            {
                "$set": {
                    "total_likes": likes_count,
                    "total_dislikes": dislikes_count,
                    "updated_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        return {
            "success": True,
            "likes": likes_count,
            "dislikes": dislikes_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/articles/{article_id}/analytics")
async def get_article_analytics(article_id: int):
    try:
        db = get_db()
        analytics_collection = db.article_analytics
        
        analytics = analytics_collection.find_one({"article_id": article_id})
        if analytics:
            analytics["_id"] = str(analytics["_id"])
            return analytics
        else:
            return {
                "article_id": article_id,
                "total_views": 0,
                "total_likes": 0,
                "total_dislikes": 0
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/articles/{article_id}/user-reaction/{user_wallet}")
async def get_user_reaction(article_id: int, user_wallet: str):
    try:
        db = get_db()
        reactions_collection = db.article_reactions
        
        reaction = reactions_collection.find_one({
            "article_id": article_id,
            "user_wallet": user_wallet
        })
        
        if reaction:
            return {
                "has_reacted": True,
                "reaction_type": reaction["reaction_type"]
            }
        else:
            return {
                "has_reacted": False,
                "reaction_type": None
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/articles/{article_id}/react/{user_wallet}")
async def remove_reaction(article_id: int, user_wallet: str):
    try:
        db = get_db()
        reactions_collection = db.article_reactions
        analytics_collection = db.article_analytics
        
        # Remove the reaction
        reactions_collection.delete_one({
            "article_id": article_id,
            "user_wallet": user_wallet
        })
        
        # Recalculate counts
        likes_count = reactions_collection.count_documents({
            "article_id": article_id,
            "reaction_type": "like"
        })
        
        dislikes_count = reactions_collection.count_documents({
            "article_id": article_id,
            "reaction_type": "dislike"
        })
        
        # Update analytics
        analytics_collection.update_one(
            {"article_id": article_id},
            {
                "$set": {
                    "total_likes": likes_count,
                    "total_dislikes": dislikes_count,
                    "updated_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        return {
            "success": True,
            "likes": likes_count,
            "dislikes": dislikes_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/users/favorites")
async def add_to_favorites(favorite: FavoriteArticle):
    try:
        db = get_db()
        favorites_collection = db.user_favorites
        
        favorite_data = {
            "user_wallet": favorite.user_wallet,
            "article_id": favorite.article_id,
            "article_title": favorite.article_title,
            "added_at": datetime.utcnow()
        }
        
        try:
            favorites_collection.insert_one(favorite_data)
            return {"success": True}
        except DuplicateKeyError:
            return {"success": True, "message": "Already in favorites"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/users/favorites/{user_wallet}/{article_id}")
async def remove_from_favorites(user_wallet: str, article_id: int):
    try:
        db = get_db()
        favorites_collection = db.user_favorites
        
        favorites_collection.delete_one({
            "user_wallet": user_wallet,
            "article_id": article_id
        })
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users/{user_wallet}/favorites")
async def get_user_favorites(user_wallet: str):
    try:
        db = get_db()
        favorites_collection = db.user_favorites
        
        favorites = list(favorites_collection.find(
            {"user_wallet": user_wallet}
        ).sort("added_at", -1))
        
        for fav in favorites:
            fav["_id"] = str(fav["_id"])
        
        return favorites
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users/{user_wallet}/articles")
async def get_user_articles(user_wallet: str):
    try:
        db = get_db()
        articles_collection = db.user_articles
        
        articles = list(articles_collection.find(
            {"user_wallet": user_wallet}
        ).sort("created_at", -1))
        
        for article in articles:
            article["_id"] = str(article["_id"])
        
        return articles
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Application startup event with MongoDB initialization
@app.on_event("startup")
async def startup_event():
    print("Starting WriteStream server...")
    
    # Initialize MongoDB
    mongodb_initialized = initialize_mongodb()
    
    if mongodb_initialized:
        try:
            print("Creating MongoDB indexes...")
            
            # Create unique indexes
            db.users.create_index("wallet_address", unique=True)
            db.article_views.create_index([("article_id", 1), ("user_wallet", 1)], unique=True)
            db.article_reactions.create_index([("article_id", 1), ("user_wallet", 1)], unique=True)
            db.user_favorites.create_index([("user_wallet", 1), ("article_id", 1)], unique=True)
            
            # Create regular indexes
            db.article_analytics.create_index("article_id", unique=True)
            db.user_articles.create_index("user_wallet")
            
            # Create text index for search
            db.user_favorites.create_index([("article_title", "text")])
            
            print("MongoDB indexes created successfully!")
            
        except Exception as e:
            print(f"Error creating indexes: {e}")
    else:
        print("Server started without MongoDB connection. Some features may not work.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
