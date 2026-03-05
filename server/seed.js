// ============================================================
//  CampusEats — seed.js
//  Run once to populate the database with:
//    • Default canteen staff account
//    • Demo student accounts
//    • Full menu
//  Usage: node server/seed.js
// ============================================================

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db, stmt } = require('./db');

const STAFF_PASS   = process.env.STAFF_DEFAULT_PASSWORD || 'staff@123';
const STUDENT_PASS = 'student@123';
const HASH_ROUNDS  = 10;

console.log('🌱 Seeding database…');

// ── Default Users ──────────────────────────────────────────
const users = [
  // Canteen staff
  { roll:'STAFF001', name:'Rajan (Head Cook)',    email:'rajan@canteen.edu',     password: STAFF_PASS,   type:'canteen' },
  { roll:'STAFF002', name:'Priya (Cashier)',      email:'priya.c@canteen.edu',   password: STAFF_PASS,   type:'canteen' },
  // Demo students — add your real students via admin or the DB directly
  { roll:'CS21B001', name:'Arjun Kumar',          email:'arjun@college.edu',     password: STUDENT_PASS, type:'student' },
  { roll:'CS21B002', name:'Priya Sharma',         email:'priya@college.edu',     password: STUDENT_PASS, type:'student' },
  { roll:'EE21A011', name:'Karthik Menon',        email:'karthik@college.edu',   password: STUDENT_PASS, type:'student' },
  { roll:'ME22C015', name:'Sneha Reddy',          email:'sneha@college.edu',     password: STUDENT_PASS, type:'student' },
  // Generic demo account
  { roll:'demo',     name:'Demo Student',         email:'demo@college.edu',      password: 'demo',       type:'student' },
  { roll:'demostaff',name:'Demo Staff',           email:'demostaff@college.edu', password: 'demo',       type:'canteen' },
];

const insertUser = db.prepare(
  'INSERT OR IGNORE INTO users (roll, name, email, password, type) VALUES (?, ?, ?, ?, ?)'
);

for (const u of users) {
  const hash = bcrypt.hashSync(u.password, HASH_ROUNDS);
  insertUser.run(u.roll, u.name, u.email, hash, u.type);
  console.log(`  ✅ User: ${u.roll} (${u.type})`);
}

// ── Menu Items ─────────────────────────────────────────────
const menuItems = [
  // BREAKFAST
  { name:'Masala Dosa',         emoji:'🫓', price:45, prep_time:10, category:'breakfast', description:'Crispy dosa with spiced potato filling, sambar & 2 chutneys',          veg:1, available:1, rating:4.5, popular:1, sort_order:1 },
  { name:'Idli Sambar (3 pcs)', emoji:'🍚', price:30, prep_time:8,  category:'breakfast', description:'Soft steamed idlis with hot sambar & coconut chutney',                  veg:1, available:1, rating:4.3, popular:0, sort_order:2 },
  { name:'Poha',                emoji:'🥘', price:25, prep_time:6,  category:'breakfast', description:'Flattened rice with peanuts, mustard, turmeric & curry leaves',         veg:1, available:1, rating:4.1, popular:0, sort_order:3 },
  { name:'Upma',                emoji:'🍲', price:25, prep_time:8,  category:'breakfast', description:'Savory semolina with mixed vegetables & tempering',                     veg:1, available:1, rating:4.0, popular:0, sort_order:4 },
  { name:'Bread Omelette',      emoji:'🍳', price:40, prep_time:7,  category:'breakfast', description:'Fluffy 2-egg omelette with buttered toast',                             veg:0, available:1, rating:4.4, popular:0, sort_order:5 },
  { name:'Puri Bhaji',          emoji:'🥙', price:40, prep_time:10, category:'breakfast', description:'3 puris served with spiced potato bhaji',                               veg:1, available:1, rating:4.2, popular:1, sort_order:6 },
  // MAINS
  { name:'Veg Fried Rice',         emoji:'🍳', price:60, prep_time:12, category:'mains', description:'Wok-tossed basmati rice with mixed vegetables & soy sauce',               veg:1, available:1, rating:4.3, popular:1, sort_order:1 },
  { name:'Paneer Butter Masala',   emoji:'🍛', price:85, prep_time:15, category:'mains', description:'Rich paneer curry in creamy tomato gravy with 2 fresh rotis',             veg:1, available:1, rating:4.7, popular:1, sort_order:2 },
  { name:'Dal Rice + Papad',       emoji:'🍽️', price:50, prep_time:8,  category:'mains', description:'Yellow dal tadka with steamed basmati rice & crispy papad',               veg:1, available:1, rating:4.1, popular:0, sort_order:3 },
  { name:'Chicken Biryani',        emoji:'🍗', price:90, prep_time:15, category:'mains', description:'Fragrant basmati rice with spiced chicken & cooling raita',                veg:0, available:1, rating:4.8, popular:1, sort_order:4 },
  { name:'Egg Biryani',            emoji:'🥚', price:70, prep_time:12, category:'mains', description:'Aromatic biryani topped with boiled eggs & crispy fried onions',          veg:0, available:1, rating:4.5, popular:0, sort_order:5 },
  { name:'Chole Chawal',           emoji:'🍚', price:55, prep_time:10, category:'mains', description:'Spicy chickpea curry with steamed rice & a pickle',                        veg:1, available:1, rating:4.2, popular:0, sort_order:6 },
  // SNACKS
  { name:'Veg Burger',     emoji:'🍔', price:55, prep_time:8,  category:'snacks', description:'Crispy aloo-tikki patty with lettuce, tomato, onion & cheese sauce',    veg:1, available:1, rating:4.3, popular:1, sort_order:1 },
  { name:'Samosa (2 pcs)', emoji:'🥟', price:20, prep_time:5,  category:'snacks', description:'Flaky golden pastry filled with spiced potato & green peas',             veg:1, available:1, rating:4.6, popular:1, sort_order:2 },
  { name:'Vada Pav',       emoji:'🫔', price:25, prep_time:5,  category:'snacks', description:'Mumbai-style spiced potato fritter in a soft pav bun',                   veg:1, available:1, rating:4.7, popular:1, sort_order:3 },
  { name:'French Fries',   emoji:'🍟', price:45, prep_time:8,  category:'snacks', description:'Crispy golden fries seasoned and served with ketchup & mayo',            veg:1, available:1, rating:4.4, popular:0, sort_order:4 },
  { name:'Pav Bhaji',      emoji:'🍞', price:55, prep_time:10, category:'snacks', description:'Buttery spiced mixed-vegetable mash with 2 butter-toasted pavs',          veg:1, available:1, rating:4.5, popular:1, sort_order:5 },
  { name:'Egg Roll',       emoji:'🌯', price:45, prep_time:8,  category:'snacks', description:'Spiced egg wrapped in flaky paratha with onions & tangy sauce',           veg:0, available:1, rating:4.3, popular:0, sort_order:6 },
  // BEVERAGES
  { name:'Masala Chai',       emoji:'☕', price:15, prep_time:4, category:'beverages', description:'Classic spiced Indian milk tea with cardamom & fresh ginger',      veg:1, available:1, rating:4.8, popular:1, sort_order:1 },
  { name:'Cold Coffee',       emoji:'🧋', price:40, prep_time:4, category:'beverages', description:'Chilled blended coffee with creamy milk & vanilla ice cream',       veg:1, available:1, rating:4.6, popular:1, sort_order:2 },
  { name:'Fresh Lime Soda',   emoji:'🍋', price:25, prep_time:3, category:'beverages', description:'Refreshing lime soda — choose sweet, salted, or mixed',            veg:1, available:1, rating:4.4, popular:0, sort_order:3 },
  { name:'Lassi',             emoji:'🥛', price:30, prep_time:3, category:'beverages', description:'Thick creamy yogurt drink — sweet or salted, your choice',         veg:1, available:1, rating:4.5, popular:0, sort_order:4 },
  // DESSERTS
  { name:'Gulab Jamun (2 pcs)', emoji:'🍮', price:30, prep_time:3, category:'desserts', description:'Soft milk-solid dumplings soaked in rose-flavored sugar syrup',  veg:1, available:1, rating:4.7, popular:1, sort_order:1 },
  { name:'Ice Cream',           emoji:'🍦', price:35, prep_time:2, category:'desserts', description:'Creamy scoop with your choice of topping',                         veg:1, available:1, rating:4.4, popular:0, sort_order:2 },
];

const insertItem = db.prepare(`
  INSERT OR IGNORE INTO menu_items (name, emoji, price, prep_time, category, description, veg, available, rating, popular, sort_order)
  VALUES (@name, @emoji, @price, @prep_time, @category, @description, @veg, @available, @rating, @popular, @sort_order)
`);

for (const item of menuItems) {
  insertItem.run(item);
  console.log(`  🍽️  Menu: ${item.name}`);
}

// Default settings
const settings = [
  ['canteen_open',    'true'],
  ['college_name',    process.env.COLLEGE_NAME    || 'Your College'],
  ['canteen_name',    process.env.CANTEEN_NAME    || 'CampusEats'],
  ['pickup_counter',  process.env.PICKUP_COUNTER  || 'Counter 2, Ground Floor'],
  ['todays_special',  'Chicken Biryani — ₹90'],
];

const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
for (const [k, v] of settings) upsert.run(k, v);

console.log('\n✅ Database seeded successfully!');
console.log('\n📋 Default login credentials:');
console.log('   Staff:   STAFF001 / ' + STAFF_PASS);
console.log('   Student: CS21B001 / ' + STUDENT_PASS);
console.log('   Demo:    demo / demo   (student)');
console.log('   Demo:    demostaff / demo (staff)\n');
