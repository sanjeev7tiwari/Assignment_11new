const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());
const session = require('express-session');
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'maikyubatau',
  resave: false,
  saveUninitialized: true,
}))

// Serve static files
app.set('view engine', 'ejs');

app.get("/contact", function (req, res) {
  if (!req.session.isLoggedIn) {
    res.redirect("/login");
    return;
  }
  const username = req.session.user.username;
  res.render("contact", { user: username });
});

app.get("/about", function (req, res) {
  if (!req.session.isLoggedIn) {
    res.redirect("/login");
    return;
  }
  const username = req.session.user.username;
  res.render("about", { user: username });
});

app.get("/", function (req, res) {
  if (!req.session.isLoggedIn) {
    res.redirect("/login");
    return;
  }
  console.log(req.session.user.username);
  res.render("home", { user: req.session.user.username });
});

app.get("/todo", function (req, res) {
  if (!req.session.isLoggedIn) {
    res.redirect("/login");
    return;
  }

  fs.readFile("database.json", "utf-8", (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error reading data.json");
    } else {
      let todos = [];
      try {
        const todoData = JSON.parse(data); // Convert the data to an object
        const userEmail = req.session.user.email;
        todos = todoData[userEmail] || []; // Get the array of todos for the user, or an empty array if not found
      } catch (parseError) {
        console.error(parseError);
      }
      res.render("todo", { user: req.session.user.username, data: todos });
    }
  });
});

// Route to handle adding a new todo
app.post("/todo", function (req, res) {
  if (!req.session.isLoggedIn) {
    res.status(401).send("Unauthorized");
    return;
  }

  const email = req.session.user.email;
  const todoData = req.body;

  saveTodoInFile(todoData, email, function (err) {
    if (err) {
      console.error(err);
      res.status(500).send("Error saving todo");
    } else {
      res.status(200).json({ message: "Success" });
    }
  });
});

// Route to get all todos
app.get("/todo-data", function (req, res) {
  if (!req.session.isLoggedIn) {
    res.status(401).send("Unauthorized");
    return;
  }
  const email = req.session.user.email;

  readtaskFromFile(function (err, data) {
    if (err) {
      res.status(500).send("error");
      return;
    }
    res.status(200).json(data[email]);
  });
});

// Route to delete a todo
app.delete("/delete-todo/:id", function (req, res) {
  if (!req.session.isLoggedIn) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const todoId = req.params.id;
  const email = req.session.user.email;
  deleteTodoById(todoId, email, function (err) {
    if (err) {
      res.status(500).send("error");
      return;
    }
    res.status(200).send("success");
  });
});

// Route to update a todo
app.patch("/update-todo/:id", function (req, res) {
  if (!req.session.isLoggedIn) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const todoId = req.params.id;
  const updates = req.body.completed;
  const email = req.session.user.email;
  updateTodoById(todoId, updates, email, function (err) {
    if (err) {
      res.status(500).send("error");
      return;
    }
    res.status(200).send("success");
  });
});

//login
app.get("/login", function (req, res) {
  if (req.session.isLoggedIn) {
    res.redirect("/");
    return;
  }
  res.render("login", { error: null });
});

app.get("/signup", function (req, res) {
  if (req.session.isLoggedIn) {
    res.redirect("/");
    return;
  }
  res.render("signup", { error: null });
});

app.post("/login", function (req, res) {
  if (req.session.isLoggedIn) {
    res.redirect("/");
    return;
  }
  const email = req.body.email;
  const password = req.body.password;

  authenticateUser(email, password, (err, data) => {
    if (err) {
      console.log(err);
      res.render("login", { error: err });
    } else {
      req.session.isLoggedIn = true;
      console.log(data);
      req.session.user = data;
      req.status = 200;
      res.redirect("/");
    }
  });
});

app.get("/logout", function (req, res) {
  // Clear the session
  req.session.isLoggedIn = false;
  req.session.username = null;

  // Redirect to the login page
  res.redirect("/login");
});

app.post("/signup", function (req, res) {
  if (req.session.isLoggedIn) {
    res.redirect("/");
    return;
  }
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const confirm_password = req.body.confirm_password;
  const user = { email, password, username };

  // Check if the passwords match
  if (password !== confirm_password) {
    res.status(400).send("Passwords do not match.");
    return;
  }

  saveDetails(user, (err) => {
    if (err) {
      console.log(err);
      res.render("signup", { error: err });
    } else {
      res.status(200);
      res.redirect("/login");
    }
  });
});

app.listen(3000, function () {
  console.log("server on port 3000");
});

// Existing functions for handling todos
function readtaskFromFile(callback) {
  fs.readFile("database.json", "utf-8", (err, data) => {
    if (err) {
      callback(err);
      return;
    }

    if (!data || data.length === 0) {
      // If the file is empty
      callback(null, {});
      return;
    }

    try {
      data = JSON.parse(data); // Convert string to object
      callback(null, data);
    } catch (err) {
      callback(err);
    }
  });
}

function saveTodoInFile(todoData, email, callback) {
  readtaskFromFile(function (err, data) {
    if (err) {
      callback(err);
      return;
    }

    if (data[email] === undefined) {
      data[email] = [];
    }

    const id = Date.now().toString();
    const completed = false;
    const todo = {
      ...todoData,
      id,
      completed,
    };

    data[email].push(todo);

    fs.writeFile("database.json", JSON.stringify(data), function (err) {
      if (err) {
        callback(err);
        return;
      }
      callback(null);
    });
  });
}

function deleteTodoById(id, email, callback) {
  readtaskFromFile(function (err, data) {
    if (err) {
      callback(err);
      return;
    }

    const updatedTodos = data[email].filter((todo) => todo.id !== id);
    data[email] = updatedTodos;
    fs.writeFile("database.json", JSON.stringify(data), function (err) {
      if (err) {
        callback(err);
        return;
      }

      callback(null);
    });
  });
}

function updateTodoById(id, updates, email, callback) {
  readtaskFromFile(function (err, data) {
    if (err) {
      callback(err);
      return;
    }

    if (!data[email]) {
      callback("User not found");
      return;
    }

    const updatedTodos = data[email].map((todo) => {
      if (todo.id === id) {
        todo.completed = updates; // Merge the existing todo with updates
      }
      return todo;
    });

    data[email] = updatedTodos; // Update the user's todo list

    fs.writeFile("database.json", JSON.stringify(data), function (err) {
      if (err) {
        callback(err);
        return;
      }

      callback(null);
    });
  });
}

// Authenticate User
function authenticateUser(email, password, callback) {
  readAllUsers((err, data) => {
    if (err) {
      callback(err);
      return;
    } else {
      console.log(data);
      console.log(email, password);
      for (let i = 0; i < data.length; i++) {
        if (data[i].email == email && data[i].password == password) {
          callback(null, data[i]);
          return;
        }
      }
      callback("Invalid Credentials");
    }
  });
}

// save details in file
function saveDetails(user, callback) {
  readAllUsers((err, data) => {
    if (err) {
      callback(err);
      return;
    } else {
      for (let i = 0; i < data.length; i++) {
        if (data[i].email == user.email) {
          callback("Email already exists");
          return;
        }
      }
      data.push(user);
      fs.writeFile("userData.txt", JSON.stringify(data), (err) => {
        if (err) {
          callback(err);
          return;
        }
        callback(null);
      });
    }
  });
}

// Function to read all users from file
function readAllUsers(callback) {
  fs.readFile("userData.txt", "utf-8", function (err, data) {
    if (err) {
      callback(err);
    } else {
      let users = [];
      try {
        users = JSON.parse(data);
      } catch (parseError) {
        console.error(parseError);
      }
      callback(null, users);
    }
  });
}
