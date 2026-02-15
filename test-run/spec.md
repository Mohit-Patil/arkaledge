# Simple CLI Calculator

Build a Node.js CLI calculator application.

## Requirements

1. Create a file `calculator.js` that can be run with `node calculator.js <operation> <num1> <num2>`
2. Support four operations: `add`, `subtract`, `multiply`, `divide`
3. Print the result to stdout in the format: `Result: <number>`
4. Handle division by zero with an error message: `Error: Division by zero`
5. Handle invalid operations with: `Error: Unknown operation`
6. Handle missing arguments with a usage message

## Example Usage

```
node calculator.js add 5 3       # Output: Result: 8
node calculator.js multiply 4 7  # Output: Result: 28
node calculator.js divide 10 0   # Output: Error: Division by zero
```
