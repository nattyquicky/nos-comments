import React, { Component } from "react";
import ReactDOM from "react-dom";
import {
  BrowserRouter as Router,
  Route,
  Switch,
  Redirect,
  Link
} from "react-router-dom";

// import "bootstrap/dist/css/bootstrap.css";

// import "../node_modules/jquery/dist/jquery.js";

import Posts from "./posts.js";
import Post from "./post.js";
import "../assets/css/style.css"
export default class Routes extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <div className="appFrame">
        <Router>
          <div>
            <Switch>
              <Route path="/" exact component={Posts} />

              <Route
                path="/post/:id"
                exact
                render={props => <Post {...props} />}
              />
            </Switch>
          </div>
        </Router>
      </div>
    );
  }
}
