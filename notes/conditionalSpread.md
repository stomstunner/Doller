const name = "Ujjwal";

const user = {
  age: 25,
  ...(name && { name: name })
};

console.log(user);

# output 
{
  age: 25,
  name: "Ujjwal"
}

# empty name 
const name = "";

const user = {
  age: 25,
  ...(name && { name: name })
};

console.log(user);

# output
{
  age: 25
}