// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Writestream {
    struct Article {
        uint256 id;
        address author;
        string title;
        string ipfsHash;
        uint256 price;
        uint256 upvotes;
        uint256 downvotes;
    }

    uint256 public articleCount = 0;
    mapping(uint256 => Article) public articles;
    mapping(uint256 => mapping(address => bool)) public hasAccess;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => bool)) public userVote; // true for upvote, false for downvote

    event ArticlePublished(uint256 indexed id, address indexed author, string title, string ipfsHash);
    event TipSent(uint256 indexed id, address indexed from, uint256 amount);
    event ArticlePurchased(uint256 indexed id, address indexed buyer);
    event ArticleVoted(uint256 indexed id, address indexed voter, bool isUpvote);

    function publishArticle(string memory title, string memory ipfsHash, uint256 price) public {
        articleCount++;
        articles[articleCount] = Article(articleCount, msg.sender, title, ipfsHash, price, 0, 0);
        emit ArticlePublished(articleCount, msg.sender, title, ipfsHash);
    }

    function tipWriter(uint256 articleId) public payable {
        Article memory article = articles[articleId];
        payable(article.author).transfer(msg.value);
        emit TipSent(articleId, msg.sender, msg.value);
    }

    function purchaseArticle(uint256 articleId) public payable {
        Article storage article = articles[articleId];
        require(article.price > 0, "Article is free");
        require(msg.value >= article.price, "Insufficient payment");
        hasAccess[articleId][msg.sender] = true;
        payable(article.author).transfer(msg.value);
        emit ArticlePurchased(articleId, msg.sender);
    }

    function checkAccess(uint256 articleId, address user) public view returns (bool) {
        Article memory article = articles[articleId];
        // Free articles are accessible to everyone
        if (article.price == 0) {
            return true;
        }
        // Paid articles require purchase
        return hasAccess[articleId][user];
    }

    function isArticleFree(uint256 articleId) public view returns (bool) {
        Article memory article = articles[articleId];
        return article.price == 0;
    }

    function voteArticle(uint256 articleId, bool isUpvote) public {
        // For free articles, anyone can vote
        // For paid articles, only purchasers can vote
        Article memory article = articles[articleId];
        if (article.price > 0) {
            require(hasAccess[articleId][msg.sender], "Must purchase article to vote");
        }
        require(!hasVoted[articleId][msg.sender], "Already voted on this article");
        
        Article storage articleStorage = articles[articleId];
        hasVoted[articleId][msg.sender] = true;
        userVote[articleId][msg.sender] = isUpvote;
        
        if (isUpvote) {
            articleStorage.upvotes++;
        } else {
            articleStorage.downvotes++;
        }
        
        emit ArticleVoted(articleId, msg.sender, isUpvote);
    }

    function getArticleVotes(uint256 articleId) public view returns (uint256 upvotes, uint256 downvotes) {
        Article memory article = articles[articleId];
        return (article.upvotes, article.downvotes);
    }

    function hasUserVoted(uint256 articleId, address user) public view returns (bool) {
        return hasVoted[articleId][user];
    }

    function getUserVote(uint256 articleId, address user) public view returns (bool) {
        return userVote[articleId][user];
    }
}
