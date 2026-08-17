// Callback Hell Solution Examples

// 1. Using Promises
function stepOne() {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("Step 1 complete");
      resolve();
    }, 1000);
  });
}

function stepTwo() {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("Step 2 complete");
      resolve();
    }, 1000);
  });
}

function stepThree() {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("Step 3 complete");
      resolve();
    }, 1000);
  });
}

stepOne()
  .then(stepTwo)
  .then(stepThree)
  .then(() => console.log("All steps completed"))
  .catch((err) => console.log(err));

// 2. Using async/await
async function runSteps() {
  await stepOne();
  await stepTwo();
  await stepThree();
  console.log("Finished using async/await");
}

runSteps();

// 3. Using named functions instead of nested callbacks
function firstTask(callback) {
  setTimeout(() => {
    console.log("First task done");
    callback();
  }, 500);
}

function secondTask(callback) {
  setTimeout(() => {
    console.log("Second task done");
    callback();
  }, 500);
}

function thirdTask() {
  console.log("Third task done");
}

firstTask(() => {
  secondTask(thirdTask);
});
const num = [1,2,3,4,5,6,7,8,9,10];

function analyzeArray(arr) {
  const sum = arr.reduce((acc, n) => acc + n, 0);
  const evens = arr.filter((n) => n % 2 === 0);
  const squares = arr.map((n) => n * n);
  const sumOfSquares = squares.reduce((acc, n) => acc + n, 0);
  return { sum, evens, squares, sumOfSquares };
}

const result = analyzeArray(num);
console.log("Array:", num);
console.log("Sum:", result.sum);
console.log("Even numbers:", result.evens);
console.log("Squares:", result.squares);
console.log("Sum of squares:", result.sumOfSquares);

// Student info helper
const students = [
  { name: "Amit", age: 20, branch: "CSE", roll: "101" },
  { name: "Sita", age: 19, branch: "ECE", roll: "102" },
  { name: "Rahul", age: 21, branch: "ME", roll: "103" }
];

function printStudent(s) {
  console.log("Name:", s.name);
  console.log("Age:", s.age);
  console.log("Branch:", s.branch);
  console.log("Roll:", s.roll);
}

function printAllStudents(list) {
  list.forEach((s, i) => {
    console.log(`\nStudent ${i + 1}:`);
    printStudent(s);
  });
}

printAllStudents(students);