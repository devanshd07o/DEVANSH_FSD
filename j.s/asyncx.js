function register() {
  console.log("Register function called");
}

function login() {
  console.log("Login function called");
}

function data() {
  console.log("Data function called");
}

function getData() {
  console.log("Get data function called");
}

function runApp() {
  const output = document.getElementById("output");
  const messages = [];

  register();
  login();
  data();
  getData();

  messages.push("Register function called");
  messages.push("Login function called");
  messages.push("Data function called");
  messages.push("Get data function called");
  messages.push("Calling another application");

  if (output) {
    output.innerHTML = messages.join("<br>");
  }

  console.log("Calling another application");
}

window.onload = runApp;
