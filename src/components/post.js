import React from "react";
// import axios from "axios";
import { Radio, input } from "bootstrap";
// import "./App.css";
import bg from "../assets/img/bg7.jpg";
// import "./post/css/style.css";
import {sc, u, wallet} from "@cityofzion/neon-js";
import injectSheet from "react-jss";
import PropTypes from "prop-types";
import { injectNOS, nosProps } from "@nosplatform/api-functions/lib/react";

const styles = {
  button: {
    margin: "16px",
    fontSize: "14px"
  }
};

//const scriptHash = "3fe71d6e18ea7d069df34f93d211466550b5b0e3"
const scriptHash = "149f3264c4cd8d46e9a6c46261685b06cee22a3d"
const known_integer_keys = []


class Post extends React.Component {

    async componentDidMount() {

    var id = this.props.location.state.post.id
    var post = await this.get_post(id)
    var list = []
    var comments = post.get("comments")

    for (var i=0; i<comments.length; i++) {
        list.push({"id": comments[i][0], "content": comments[i][1]})
    }

    this.setState({
        author: post.get("user"),
        title: post.get("title"),
        desc: post.get("text"),
        comments: list
      })
    }

  constructor(props) {
    super(props);
    this.state = {
    author: "",
    postedDate: "",
    title: "",
    desc: "",
    comments: [
    ]};
  }

    // =============== HELPER FUNCS ===============
    // ============================================
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
            if (wallet.isScriptHash(v.value)) {
                value = wallet.getAddressFromScriptHash(u.reverseHex(v.value))
            }   
            else {
                value = u.hexstring2str(v.value)
            }
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



  async handleCreate (id)  {
    console.log(id);
    console.log("here");
    this.add_comment(id, this.contentInput.value)
    this.setState({
      comments: [
        ...this.state.comments,
        {
          id: await this.props.nos.getAddress(),
          content: this.contentInput.value,
          postNumber: id
          // describe: this.desInput.value
        }
      ]
    });
  };

  handleSubmit = e => {
    e.preventDefault();
    // post to rest api
    /*         axios.put(`https://jr-001-pawpatrol-course-api.herokuapp.com/api/courses/${this.state.id}`, {
                    name: this.state.name,
                    description: this.state.description,
                    image: this.state.image
                }).then(()=>{
                    console.log("updated successfully");
                    this.props.history.push({pathname:"/courses",
                    state:{courseItem: this.state}});
                }) // need push history state=courseItem again....
                    .catch((err)=>{
                    console.log("updated failed...",err);
                    throw(err);
                }); */
  };

  /*     componentWillMount(){
         // get details information by id (this.props.location.state.comment.id)
        axios.get('https://jr-001-pawpatrol-course-api.herokuapp.com/api/courses')
            .then((res)=>{
                console.log(res);
                this.setState(()=>{
                  return({courses:res.data})
                });
            })
            .catch((error)=>{throw(error)});
        } */

  render() {
    console.log("props from comments", this.props.location.state.post);
    return (
      <div className="sidebar-page-container">
        <div className="auto-container">
          <form onSubmit={this.handleSubmit} className="createForm">
            <div className="sec-title">
              <h2>Details Information</h2>
            </div>

            {/* <hr style={{ borderWidth: 1 }} /> */}
            <div>
              <h4 className="card-title">
                {this.props.location.state.post.topic}
              </h4>
              <div className="text">
                {this.props.location.state.post.text}
                {/* <h6>you can use it with the small code</h6>
                        <p>
                          Donec pede justo, fringilla vel, aliquet nec,
                          vulputate eget, arcu. In enim justo, rhoncus ut,
                          imperdiet a.
                        </p> */}

                {/* <div
                      className="tab-pane  p-20"
                      id="profile2"
                      role="tabpanel"
                    >
                      2
                    </div>
                    <div
                      className="tab-pane p-20"
                      id="messages2"
                      role="tabpanel"
                    >
                      3
                    </div> */}
              </div>
              <hr />
              {/* More comments about {this.props.location.state.post.id} */}
              {/* <div>
              {" "}
              More comments about {this.props.location.state.comment.topic}
            </div>
            <div>
              {this.state.detailInfo.author} {this.state.detailInfo.postedDate}{" "}
            </div>
            <div>Title: {this.state.detailInfo.title} </div> */}
              <div className="sec-title">
                <h2>Comments:</h2>
              </div>
              <div>
                <ul className="list-group">
                  {this.state.comments.map((item, index) => {
                    let target = index.toString() + "demo";
                    let target1 = "#" + target;
                    console.log("target ", target1, target);
                    return (
                      <div key={index + Date()} className="comment-box">
                        {/* <button type="button" class="btn btn-primary" data-toggle="collapse" data-target="#demo">details + </button> */}
                        {/* <div id="demo" class="collapse"> */}
                        <div className="comment">
                          <div className="author-thumb">
                            <img
                              src={bg}
                              style={{ width: "80px", height: "80px" }}
                              alt="Generic placeholder image"
                            />
                          </div>

                          <div className="comment-inner">
                            <div className="comment-info">{item.id}</div>
                            <div className="text">{item.content}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </ul>

                <div className="comment-form">
                  <div className="sec-title">
                    <h2>Add New Comment</h2>
                  </div>

                  <div className="form-group">
                    <textarea
                      name="name"
                      rows="8"
                      cols="80"
                      className="form-control"
                      style={{ height: "100px" }}
                      ref={input => {
                        this.contentInput = input;
                      }}
                    />
                  </div>

                  <div className="form-group m-b-0">
                    <div className="text-right">
                      <button
                        className="theme-btn"
                        onClick={() =>
                          this.handleCreate(this.props.location.state.post.id)
                        }
                      >
                        <span>Submit</span> <i className="fa fa-send m-l-10" />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  className="read-more"
                  onClick={() => this.props.history.push("/")}
                >
                  Back
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

class Comment extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      detailInfo: {
        author: "Geoff",
        postedDate: "2 days ago",
        content: "title1",
        postId: ""
      }
    };
  }
}

Post.propTypes = {
  classes: PropTypes.objectOf(PropTypes.any).isRequired,
  nos: nosProps.isRequired
};

export default injectNOS(injectSheet(styles)(Post));

