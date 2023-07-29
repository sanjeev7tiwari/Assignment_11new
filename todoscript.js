// todoScript.js
const submitTodoNode = document.getElementById("submitTodo");
const userInputNode = document.getElementById("userInput");
const prioritySelectorNode = document.getElementById("prioritySelector");

const todoListNode = document.getElementById("todo-item");

submitTodoNode.addEventListener("click", function () {
  const todoText = userInputNode.value;
  const priority = prioritySelectorNode.value;

  if (!todoText || !priority) {
    alert("Please enter a todo");
    return;
  }

  var id=Date.now().toString();
  var completed = false;
  const todo = {
    todoText,
    id,
    priority,
    completed
  };

  fetch("/todo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(todo),
  })
    .then(function (response) {
      if (response.status === 200) {
        showTodoInUI(todo);
        alert("Successfull");
      } else if(response.status===401){
        window.location.href="/login";
      }
      else{
        alert("Something weird happened");
      }
    });
});
fetch("/todo-data").then(
  function(response){
      if(response.status===200){
         return response.json()
      }
      else{
          throw new Error("something weird happened");
      }
      })
      .then(function (todos) {
         // console.log(todos)
          todos.forEach(function (todo) {
              showTodoInUI(todo);
              }
          );
      }).catch(function(error){
            console.error(error);
      });

function showTodoInUI(todo) {
  const todoItemDiv = document.createElement("div");
  const todoTextNode = document.createElement("span");
  const priorityNode = document.createElement("span");
  const deleteButton = document.createElement("button");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";

  checkbox.addEventListener("change", function () {
    const isChecked=checkbox.checked;
    updateTodoOnServer(todo.id, isChecked)
      .then(function () {
        if (checkbox.checked) {
          todoTextNode.style.textDecoration = "line-through";
        } else {
          todoTextNode.style.textDecoration = "none";
        }
      })
      .catch(function (error) {
        console.error(error);
      });
  });

  todoTextNode.innerText = todo.todoText+"     ";
  priorityNode.innerText = todo.priority;
  deleteButton.innerText = "Delete";

  deleteButton.addEventListener("click", function () {
    deleteTodoOnServer(todo.id) 
      .then(function () {
        todoItemDiv.remove();
      })
      .catch(function (error) {
        console.error(error);
      });
  });
  // Append everything to the todoItemDiv
  todoItemDiv.appendChild(todoTextNode);
  todoItemDiv.appendChild(priorityNode);
  todoItemDiv.appendChild(checkbox);
  todoItemDiv.appendChild(deleteButton);

  todoListNode.appendChild(todoItemDiv);
  userInputNode.value= "";
}

  function deleteTodoOnServer(todoId) {
    return fetch(`/delete-todo/${todoId}`, {
      method: "DELETE",
    })
      .then(function (response) {
        if (response.status !== 200) {
          throw new Error("Failed to delete todo on server");
        }
      })
      .catch(function (error) {
        console.error(error);
      });
  }
  
  function updateTodoOnServer(todoId, updates) {
    const requestBody={completed:updates};
    return fetch(`/update-todo/${todoId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })
      .then(function (response) {
        if (response.status !== 200) {
          throw new Error("Failed to update todo on server");
        }
        return response.json(); // Parse the response JSON data
      })
      .catch(function (error) {
        console.error(error);
      });
  }
  
