const bcrypt = require('bcryptjs');
const isMatch = bcrypt.compareSync('admin123', '$2a$10$8KQd.NXHRyoSIepBdYBqfu6DGIQZB0iwV/Cm1B.YW5XINWi46xteS');
console.log('Is Match:', isMatch);
