const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogPostData() {
  console.info('Seeding blog post data...');
  const seedData = [];
  let i = 0;
  while (i < 10) {
    seedData.push(generateBlogPostData());
    i++;
  }
  return BlogPost.insertMany(seedData);
}

function generateBlogPostData() {
  return {
    author: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    },
    title: faker.lorem.words(),
    content: faker.lorem.paragraphs(),
    created: faker.date.past()
  };
}

function teardownDatabase() {
  console.warn('Deleting database...');
  return mongoose.connection.dropDatabase();
}

describe('Blog Post API', function() {
  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedBlogPostData();
  });

  afterEach(function() {
    return teardownDatabase();
  });

  after(function() {
    return closeServer();
  });

  describe('GET endpoint', function() {
    it('Should return all blog posts', function() {
      let res;
      return chai.request(app)
      .get('/posts')
      .then(function(_res) {
        res = _res;
        res.should.have.status(200);
        res.body.blogposts.should.have.length.of.at.least(1);
        return BlogPost.count()
      })
      .then(function(count) {
        res.body.blogposts.should.have.length.of(count)
      });
    });
    it('Should return blog posts with correct fields', function() {
      let resBlogPost;
      return chai.request(app)
      .get('/posts')
      .then(function(res) {
        res.should.have.status(200);
        res.body.blogposts.should.be.a('array');
        res.should.be.json;
        res.body.blogposts.should.have.length.of.at.least(1);
        res.body.blogposts.forEach(function(result) {
          result.should.include.keys( 'id', 'author', 'title', 'content');
          result.should.be.a('object');
        });
        resBlogPost = res.body.blogposts[0];
        return BlogPost.findById(resBlogPost.id);
      })
      .then(function(blogpost) {
        resBlogPost.id.should.equal(blogpost.id);
        resBlogPost.author.should.contain(blogpost.author.firstName);
        resBlogPost.title.should.equal(blogpost.title);
        resBlogPost.content.should.equal(blogpost.content);
      });
    });
  });

  describe('POST endpoint', function() {
    it('Should add a new blog post', function() {
      const newBlogPost = generateBlogPostData();
      return chai.request(app)
      .post('/posts')
      .send(newBlogPost)
      .then(function(res) {
        res.should.have.status(201);
      });
    });
  });

  describe('PUT endpoint', function() {
    it('Should update an existing blog post', function() {
      const updatedBlogPost = {
        title: "New Post",
        content: "Blah blah"
      };
      return BlogPost
      .findOne()
      .then(function(blog) {
        updatedBlogPost.id = blog.id;
        console.log(updatedBlogPost);
        return chai.request(app)
        .put(`/posts/${blog.id}`)
        .send(updatedBlogPost)
      })
      .then(function(res) {
        res.should.have.status(204);
      });
    });
  });

  describe('DELETE endpoint', function() {
    it('Should delete an existing endpoint', function() {
      let deletedBlog;
      BlogPost
      .findOne()
      .then(function(blog) {
        deletedBlog = blog.id
        return chai.request(app)
        .delete(`posts/${blog.id}`)
      })
      .then(function(res) {
        res.should.have.status(204);
        return BlogPost.findById(deletedBlog);
      })
      .then(function(res) {
        should.not.exist(res);
      });

    });
  });

});
