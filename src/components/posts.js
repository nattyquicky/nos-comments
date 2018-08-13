import React from "react";
import axios from "axios";
import { Radio, input } from "bootstrap";
import { BrowserRouter as Router, Link } from "react-router-dom";
import { Panel, Well, Fade, Collapse, Button } from "react-bootstrap";
import {sc, u, wallet} from "@cityofzion/neon-js";
import injectSheet from "react-jss";
import PropTypes from "prop-types";
import { injectNOS, nosProps } from "@nosplatform/api-functions/lib/react";
// import "./App.css";
import "./css/style.css";
const styles = {
  button: {
    margin: "16px",
    fontSize: "14px"
  }
};

//const scriptHash = "3fe71d6e18ea7d069df34f93d211466550b5b0e3"
const scriptHash = "149f3264c4cd8d46e9a6c46261685b06cee22a3d"
const known_integer_keys = []

class Posts extends React.Component {

    randomize() {
      var text = "";
      var possible = "0123456789";

      for (var i = 0; i < 6; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

      return text;
    }

  async componentDidMount() {
    var posts = await this.get_all_posts()
    var list = []

    //for (var [id, text] of posts) {
    for (var i=0; i<posts.length; i++) {
        var p = await this.get_post(posts[i])
        var describe = p.get("text").replace(/(([^\s]+\s\s*){20})(.*)/,"$1...");
        list.push({"id": posts[i], "topic": p.get("title"), "describe": describe, "number_of_comments": p.get("comments").length, "text": p.get("text")})
    }

    // sort
    let sortedposts = Object.assign([], list);

    sortedposts.sort((a, b) => {
      return b.number_of_comments - a.number_of_comments;
    });
    this.setState({
      posts: sortedposts
    });
    console.log("sorted is ", this.state.posts);
  }

    constructor(props) {
        super(props);
        this.state = {
          posts: [
          ]
        };
  }

  handleSubmit = e => {
    e.preventDefault();
  };

  handleCreate = () => {
    var id = this.randomize()
    var describe = this.desInput.value.replace(/(([^\s]+\s\s*){20})(.*)/,"$1...");
    this.add_post(id, this.titleInput.value, this.desInput.value)
    // post to rest api
    this.setState({
      posts: [
        ...this.state.posts,
        {
          id: id,
          topic: this.titleInput.value,
          number_of_comments: 0,
          describe: describe,
          text: this.desInput.value
        }
      ]
    });
  };

    // =============== HELPER FUNCS ===============
    // ============================================
    handlePostId(e) {
        this.setState({
            postId: e.target.value
        });
    }

    handlePostTitle(e) {
        this.setState({
            postTitle: e.target.value
        });
    }

    handlePost(e) {
        this.setState({
            post: e.target.value
        });
    }

    handleMap = async func => {
        var result = await func;
        var deserial = sc.deserialize(result)
        var map = this.process_map(deserial)
        return map
    }

    handleArray = async func => {
        var result = await func;
        var deserial = sc.deserialize(result)
        // DEBUG
        console.log(JSON.stringify(deserial, null, 4))
        var array = this.process_array(deserial)
        for (var i=0; i<array.length; i++) {
            console.log(array[i]);
        }
        return array
    }

    process_map(d) {
        if (d.type != "Map") {
            return null
        }   
        var new_map = new Map();
        var key;
        var value;
        for (var i=0; i<d.value.length; i++) {
            key = this.convert_type(d.value[i].key)
            // Handle known Integer keys as Integer (rather than ByteArray)
            if (known_integer_keys.indexOf(key) >= 0) {
                d.value[i].value.type = "Integer"
            }   
            value = this.convert_type(d.value[i].value)
            new_map.set(key, value);
        }   
        return new_map
    };

    process_array(d) {
        if (d.type != "Array") {
            return null
        }
        var new_array = [];
        var value;
        for (var i=0; i<d.value.length; i++) {
            new_array.push(this.convert_type(d.value[i]));
        }
        return new_array
    };

    convert_type(v) {
        var value;
        if (v.type == "ByteArray") {
            value = u.hexstring2str(v.value)
        }
        if (v.type == "Integer") {
            value = parseInt(u.reverseHex(v.value), 16)
        }
        if (v.type == "Array") {
            value = this.process_array(v)
        }
        if (v.type == "Map") {
            value = this.process_map(v)
        }
        return value
    }

    handleStorage(key, enc_in, dec_out) {
        return this.props.nos.getStorage({scriptHash, key, encodeInput: enc_in, decodeOutput: dec_out});
    } 

    // ================ COMMENT API ==================
    // ===============================================

    // get specific post - returns map:
    // {"user": user_hash,      (string)
    //  "title": args[2],       (string)
    //  "text": args[3],        (string)
    //  "comments": [] }        (string[])
    async get_post(postId) {
        var q = await this.handleArray(await this.handleStorage(postId, true, false))
        console.log(JSON.stringify(q, null, 4))

        var map = new Map()
        map.set("user", q[0])
        map.set("title", q[1])
        map.set("text", q[2])
        map.set("comments", q[3])

        // DEBUG
        for (var [key, value] of map) {
          console.log(key + ' = ' + value);
          if (key == "comments") {
            if (value.length > 0) {
              for (var [k,v] of value[0]) {
                  console.log(k + ' = ' + v);
              }
            }
          }
        }
        return map
    }

    // get all posts - returns map:
    // {"postID" : "postTitle"}     (string)
    async get_all_posts() {
        var q = await this.handleArray(await this.handleStorage("GET_ALL_IDS", true, false))
        // DEBUG
      //for (var [key, value] of q) {
      //  console.log(key + ' = ' + value);
      //}
        return q
    }

    // create new post, returns txid
    async add_post(postId, title, text) {
        var address = await this.props.nos.getAddress();
        console.log(address);
        
        var operation = "NewPost";
        var args = [address, postId, title, text];
        var invoke = {
            scriptHash,
            operation,
            args};
            //encodeArgs: false };

        var txid = await this.props.nos.invoke(invoke);

        // DEBUG
        console.log(txid);
    }

    // add comment, returns txid
    async add_comment(postId, text) {
        var address = await this.props.nos.getAddress();
        console.log(address);
        
        var operation = "Comment";
        var args = [address, postId, text];
        var invoke = {
            scriptHash,
            operation,
            args};
            //encodeArgs: false };

        var txid = await this.props.nos.invoke(invoke);

        // DEBUG
        console.log(txid);
    }

    // remove post, returns txid
    async remove_post(postId) {
        var address = await this.props.nos.getAddress();
        console.log(address);
        
        var operation = "RemovePost";
        var args = [address, postId];
        var invoke = {
            scriptHash,
            operation,
            args};
            //encodeArgs: false };

        var txid = await this.props.nos.invoke(invoke);

        // DEBUG
        console.log(txid);
    }

  handleSearch = () => {
    if (isNaN(this.searchInput.value) || this.searchInput.value == "") {
      let sortedposts = Object.assign([], this.state.posts);
      sortedposts.sort((a, b) => {
        return a.id - b.id;
      });
      this.setState({ searchAction: false });
    } else {
      this.setState({ searchAction: true });
      const filterdPost = this.state.posts.filter(
        p => p.id === this.searchInput.value
      );
      this.setState({ searchResult: filterdPost });
    }
  };

  handleChange(e) {
    console.log("here");
    console.log(e.target.value);
    //const searchInput = e.target.validity.valid ? parseInt(e.target.value) : "";
    const searchInput = e.target.validity.valid ? e.target.value : "";
    console.log("SERACH INPUT = " + searchInput);
    console.log(searchInput == "");
    this.setState({ searchInput: searchInput });
    //this.handleSearch()
  }

render() {
    let ids = [];
    this.state.posts.map((item, index) => {
      ids.push(item.id);
    });
    console.log("***** IDs = " + ids);

    return (
      <div className="sidebar-page-container">
        <div className="auto-container">
          <div className="comment-form col-md-4 pull-right">
            <div className="row">
              <div className="col-md-8  form-group ">
                <input
                  type="text"
                  className="form-control"
                  id="title"
                  pattern="[0-9]*"
                  placeholder="Search by ID"
                  ref={input => {
                    this.searchInput = input;
                  }}
                  onChange={e => {
                    this.handleChange(e);
                  }}
                  value={this.state.searchInput}
                />
              </div>
              <div className="col-md-4  form-group">
                <button
                  type="submit"
                  className="theme-btn"
                  onClick={this.handleSearch}
                >
                  Search
                </button>
              </div>
            </div>
          </div>
          <div className="clear-line" />
          <form onSubmit={this.handleSubmit} className="centerBlock">
            <div className="sec-title">
              <h2>posts List</h2>
            </div>
            <div className="heading">
              <div className="row">
                <div className="col-md-1  text-center">No.</div>

                <div className="col-md-7">Description</div>
                <div className="col-md-2  text-center">Most commented</div>
                <div className="col-md-2  text-center">Action</div>
              </div>
            </div>
            {this.state.searchAction ? (
              ids.indexOf(this.state.searchInput) !== -1 ? (
                this.state.searchResult.map((item, index) => {
                  return (
                    <div key={index} className="news-block-four">
                      <div className="inner-box">
                        <div className="content-box">
                          <div className="row">
                            <div className="col-md-1  text-center">
                              <b>{item.id}</b>
                            </div>
                            <div className="col-md-7">
                              <h3>
                                <Link
                                  to={{
                                    pathname: `/post/${item.id}`,
                                    state: { post: item }
                                  }}
                                >
                                  {item.topic}
                                </Link>
                              </h3>

                              <div className="text"> {item.describe}</div>
                            </div>

                            <div className="col-md-2  text-center">
                              {item.number_of_comments}
                            </div>
                            <div className="col-md-2  text-center">
                              <Link
                                to={{
                                  pathname: `/post/${item.id}`,
                                  state: { post: item }
                                }}
                                className="read-more"
                              >
                                Detail
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="news-block-four">
                  <div className="inner-box">
                    <div className="content-box">
                      <div className="row">
                        <div className="col-md-12  text-center">
                          <b>The Post with ID Not Found</b>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : (
              this.state.posts.map((item, index) => {
                return (
                  <div key={index} className="news-block-four">
                    <div className="inner-box">
                      <div className="content-box">
                        <div className="row">
                          <div className="col-md-1  text-center">
                            <b>{item.id}</b>
                          </div>
                          <div className="col-md-7">
                            <h3>
                              <Link
                                to={{
                                  pathname: `/post/${item.id}`,
                                  state: { post: item }
                                }}
                              >
                                {item.topic}
                              </Link>
                            </h3>

                            <div className="text"> {item.describe}</div>
                          </div>

                          <div className="col-md-2  text-center">
                            {item.number_of_comments}
                          </div>
                          <div className="col-md-2  text-center">
                            <Link
                              to={{
                                pathname: `/post/${item.id}`,
                                state: { post: item }
                              }}
                              className="read-more"
                            >
                              Detail
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div className="comment-form">
              <div className="sec-title">
                <h2>Create New Topic</h2>
              </div>
              <div className="row">
                <div className="col-md-5  form-group">
                  <input
                    type="text"
                    className="form-control"
                    id="title"
                    placeholder="Title"
                    ref={input => {
                      this.titleInput = input;
                    }}
                  />
                </div>
                <div className="col-md-5  form-group">
                  <input
                    type="text"
                    className="form-control"
                    id="describe"
                    placeholder="Description"
                    ref={input => {
                      this.desInput = input;
                    }}
                  />
                </div>
                <div className="col-md-2  form-group">
                  <button
                    type="submit"
                    className="theme-btn"
                    onClick={this.handleCreate}
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

Posts.propTypes = {
  classes: PropTypes.objectOf(PropTypes.any).isRequired,
  nos: nosProps.isRequired
};

export default injectNOS(injectSheet(styles)(Posts));
