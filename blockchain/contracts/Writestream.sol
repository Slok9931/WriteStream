// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Writestream {
    struct Article {
        uint256 id;
        address author;
        string title;
        string ipfsHash;
        uint256 price;
    }

    uint256 public articleCount = 0;
    mapping(uint256 => Article) public articles;
    mapping(uint256 => mapping(address => bool)) public hasAccess;

    event ArticlePublished(uint256 indexed id, address indexed author, string title, string ipfsHash);
    event TipSent(uint256 indexed id, address indexed from, uint256 amount);
    event ArticlePurchased(uint256 indexed id, address indexed buyer);

    function publishArticle(string memory title, string memory ipfsHash, uint256 price) public {
        articleCount++;
        articles[articleCount] = Article(articleCount, msg.sender, title, ipfsHash, price);
        emit ArticlePublished(articleCount, msg.sender, title, ipfsHash);
    }

    function tipWriter(uint256 articleId) public payable {
        Article memory article = articles[articleId];
        payable(article.author).transfer(msg.value);
        emit TipSent(articleId, msg.sender, msg.value);
    }

    function purchaseArticle(uint256 articleId) public payable {
        Article storage article = articles[articleId];
        require(msg.value >= article.price, "Insufficient payment");
        hasAccess[articleId][msg.sender] = true;
        payable(article.author).transfer(msg.value);
        emit ArticlePurchased(articleId, msg.sender);
    }

    function checkAccess(uint256 articleId, address user) public view returns (bool) {
        return hasAccess[articleId][user];
    }
}
