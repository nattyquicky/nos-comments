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
// import "./post/css/style.css";
const styles = {
  button: {
    margin: "16px",
    fontSize: "14px"
  }
};

const scriptHash = "3fe71d6e18ea7d069df34f93d211466550b5b0e3"
const known_integer_keys = []

class Posts extends React.Component {

    randomize() {
      var text = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for (var i = 0; i < 10; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

      return text;
    }

  async componentDidMount() {
    var posts = await this.get_all_posts()
    var list = []

    for (var [id, text] of posts) {
        var p = await this.get_post(id)
        var describe = p.get("text").replace(/(([^\s]+\s\s*){20})(.*)/,"$1...");
        list.push({"id": id, "topic": p.get("title"), "describe": describe, "number_of_comments": p.get("comments").length, "text": p.get("text")})
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
//          {
//            id: 1,
//            topic: "Ethereum Needs Incentive for Growth",
//            number_of_comments: 45,
//            describe:
//              "This week, Ethereum tried to follow Bitcoin higher, but so far its dynamics falls behind that of the flagship. On Wednesday, July 25, Ethereum trades at 473.52 and is a little bit behind.          It is remarkable how the events developed during the last day. Ethereum experienced fast growth, having started from the support at 450.00 and reaching 485.00 during one session. The cryptocurrency stopped at 479.00 from which point a small local correction started. The day before, the traded value of Ethereum was double the average daily values."
//          },
//          {
//            id: 2,
//            topic: "Bitcoin Price Rally Stalls Ahead of CME Futures Expiry",
//            number_of_comments: 32,
//            describe:
//              "The significant technical resistance for Ethereum is at the level of 482.00. The 50-DMA level, which is still limiting the growth impulse, goes along this same line. In case the cryptocurrency succeeds to break out this point and rise higher, the way to 500.00 and later to 515.00-516.00 will open. If Ethereum is not able to break out the indicated resistance effectively, the ambient background will compel investors to sell the cryptocurrency until the price goes down to 460.00 – the area of intermediate support. The key support level for Ethereum is at 421.00"
//          },
//          {
//            id: 3,
//            topic: "Facebook Crashes After-Hours Despite Trade-Deal Rally",
//            number_of_comments: 36,
//            describe:
//              "Among the fundamental information important for Ethereum, one should pay attention to the announcement of the creation of MyEtherWallet mobile app (a wallet for cryptocurrencies). Cryptocurrency on your smartphone screen is a new and productive step forward, which certainly is positive for virtual currencies on the whole and for Ethereum in particular. MEW Connect app reportedly has been created in order to significantly simplify the use of a wallet, as well as, to solve several security issues at the same time"
//          }
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
        var q = await this.handleMap(this.handleStorage(postId, true, false))
        // DEBUG
        for (var [key, value] of q) {
          console.log(key + ' = ' + value);
          if (key == "comments") {
            if (value.length > 0) {
              for (var [k,v] of value[0]) {
                  console.log(k + ' = ' + v);
              }
            }
          }
        }
        return q
    }

    // get all posts - returns map:
    // {"postID" : "postTitle"}     (string)
    async get_all_posts() {
        var q = await this.handleMap(this.handleStorage("GET_ALL_IDS", true, false))
        // DEBUG
        for (var [key, value] of q) {
          console.log(key + ' = ' + value);
        }
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


  render() {
    return (
      <div className="sidebar-page-container">
        <div className="auto-container">
          <form onSubmit={this.handleSubmit} className="centerBlock">
            <div className="sec-title">
              <h2>posts List</h2>
            </div>

            <div className="row heading">
              <div className="col-md-1  text-center">No.</div>

              <div className="col-md-7">Description</div>
              <div className="col-md-2  text-center">Most commented</div>
              <div className="col-md-2  text-center">Action</div>
            </div>

            {this.state.posts.map((item, index) => {
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
            })}

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
