const bcrypt = require("bcrypt");

(async()=>{

const hash = await bcrypt.hash("Intencion2026",10);

console.log(hash);

})();