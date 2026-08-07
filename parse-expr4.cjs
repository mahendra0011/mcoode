const babel = require('@babel/parser');

// Use String.raw to avoid backtick issues in the test script itself
const t1 = String.raw`<div className={`hello`}>x</div>`;
const t2 = String.raw`<div className={`hello ${x}`}>x</div>`;
const t3 = String.raw`<div className={`hello ${x === "a" ? "b" : "c"`}>x</div>`;

const tests = [
  { name: 'plain template', code: t1 },
  { name: 'template with ${}', code: t2 },
  { name: 'template with ternary in ${}', code: t3 },
];

tests.forEach((test) => {
  try {
    babel.parse(test.code, { sourceType: 'module', plugins: ['jsx'] });
    console.log(`OK - ${test.name}`);
  } catch(e) {
    console.log(`ERROR - ${test.name}: ${e.message}`);
  }
});
