const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const evenNumbers = numbers.filter((num) => num % 2 === 0);
const squares = numbers.map((num) => num * num);
const sum = numbers.reduce((acc, num) => acc + num, 0);

const output = document.getElementById("output");

if (output) {
  output.innerHTML = `
    <strong>Even numbers:</strong> ${evenNumbers.join(", ")}<br>
    <strong>Squares:</strong> ${squares.join(", ")}<br>
    <strong>Sum of array:</strong> ${sum}
  `;
}

console.log("Even numbers:", evenNumbers);
console.log("Squares:", squares);
console.log("Sum of array:", sum);
