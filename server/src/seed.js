// Creates a demo business with sample data so every screen has something to show.
// Run with:  npm run seed      (inside the server folder)
// Login:     demo@leadbook.test / demo1234
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Organization = require('./models/Organization');
const User = require('./models/User');
const Contact = require('./models/Contact');
const Lead = require('./models/Lead');
const Activity = require('./models/Activity');
const Task = require('./models/Task');
const Automation = require('./models/Automation');
const EmailLog = require('./models/EmailLog');
const { ensureAutomations } = require('./services/automation');
const { todayIn, addDays } = require('./utils/dates');

const DEMO_EMAIL = 'demo@leadbook.test';

async function run() {
  await connectDB();
  const today = todayIn();
  const day = (n) => addDays(today, n);
  const ago = (n) => new Date(Date.now() - n * 864e5);

  // Remove the previous demo business (only the demo one).
  const old = await User.findOne({ email: DEMO_EMAIL });
  if (old) {
    const org = old.org;
    await Promise.all([Contact, Lead, Activity, Task, Automation, EmailLog, User].map((M) => M.deleteMany({ org })));
    await Organization.deleteOne({ _id: org });
    console.log('Removed old demo data.');
  }

  const org = await Organization.create({
    name: 'Demo Business',
    settings: { businessName: 'Demo Business', senderName: 'Asha Verma', summaryEmail: '' }
  });
  const owner = await User.create({ org: org._id, name: 'Asha Verma', email: DEMO_EMAIL, password: 'demo1234', role: 'owner', title: 'Owner' });
  const ravi = await User.create({ org: org._id, name: 'Ravi Kumar', email: 'ravi@leadbook.test', password: 'demo1234', role: 'member', title: 'Sales Executive' });
  await ensureAutomations(org._id);

  const contacts = [
    ['Fatima Shaikh', 'Procurement Head', 'Crescent Pharma', 'Mumbai', 'Enterprise', 'VIP', 'Healthcare', 540000, 2],
    ['Rahul Mehta', 'Director', 'Mehta Logistics Pvt Ltd', 'Pune', 'Enterprise', 'Active', 'Logistics', 385000, 9],
    ['Priya Sharma', 'Owner', 'Sharma Textiles', 'Surat', 'SMB', 'Active', 'Manufacturing', 190000, 15],
    ['Arjun Nair', 'Managing Partner', 'Nair Coffee Estates', 'Kochi', 'SMB', 'Active', 'Food & Beverage', 145000, 22],
    ['Anjali Iyer', 'Designer', 'Iyer Design Studio', 'Chennai', 'Retail', 'Active', 'Consulting', 38000, 30],
    ['Vikram Singh', 'Owner', 'Singh Auto Parts', 'Ludhiana', 'SMB', 'Inactive', 'Manufacturing', 72000, 60]
  ];
  for (const [i, [name, title, company, city, segment, status, industry, revenue, d]] of contacts.entries()) {
    const c = await Contact.create({
      org: org._id, owner: owner._id, name, title, company, city, segment, status, industry, revenue,
      email: `${name.split(' ')[0].toLowerCase()}@${company.split(' ')[0].toLowerCase()}.example`,
      phone: `+91 98200 1000${i + 1}`
    });
    await Contact.collection.updateOne({ _id: c._id }, { $set: { createdAt: ago(d) } });
  }

  const leads = [
    ['Neha Gupta', 'BrightPath Academy', 'School ERP setup', 'Website', 'new', 45000, 1, 1, owner],
    ['Meera Joshi', 'Joshi Dental Clinic', 'Clinic booking system', 'Social Media', 'new', 30000, 2, 2, ravi],
    ['Karan Malhotra', 'UrbanNest Interiors', 'Showroom CRM', 'Referral', 'contacted', 120000, 0, 4, owner],
    ['Sneha Reddy', 'GreenLeaf Organics', 'Online store', 'Email Campaign', 'qualified', 85000, 0, 6, owner],
    ['Rohan Desai', 'Desai Constructions', 'Project tracking software', 'IndiaMART', 'proposal', 350000, 4, 8, owner],
    ['Imran Khan', 'Khan Exports', 'Export billing module', 'Website', 'proposal', 175000, 6, 10, ravi],
    ['Aditya Kulkarni', 'TechNova Solutions', 'Annual support contract', 'Website', 'won', 210000, null, 12, owner],
    ['Pooja Patel', 'Patel Sweets', 'Billing app', 'Referral', 'lost', 25000, null, 20, ravi]
  ];
  for (const [i, [name, company, deal, source, stage, value, fu, d, who]] of leads.entries()) {
    const l = await Lead.create({
      org: org._id, owner: who._id, name, company, deal, source, stage, value,
      followUp: fu == null ? '' : day(fu), closeDate: day(10 + i * 3),
      email: `${name.split(' ')[0].toLowerCase()}@${company.split(' ')[0].toLowerCase()}.example`,
      wonAt: stage === 'won' ? ago(1) : undefined
    });
    await Lead.collection.updateOne({ _id: l._id }, { $set: { createdAt: ago(d) } });
  }

  const acts = [
    ['Call', 'Follow-up call with Karan Malhotra', 'UrbanNest Interiors', 0, '10:00', false, owner],
    ['Demo', 'Demo for BrightPath Academy', 'Neha Gupta', 0, '13:00', false, owner],
    ['Email', 'Send revised quote to Rohan Desai', 'Desai Constructions', 1, '11:00', false, owner],
    ['Meeting', 'Meeting with Crescent Pharma', 'Fatima Shaikh', 3, '15:30', false, owner],
    ['Call', 'Call with Imran Khan', 'Khan Exports', 5, '12:00', false, ravi],
    ['Call', 'Discussed pricing with Sneha Reddy', 'GreenLeaf Organics', -1, '16:30', true, owner, 'Budget approved. Needs GST invoice before signing.'],
    ['Note', 'Left voicemail for Meera Joshi', 'Joshi Dental Clinic', -2, '11:15', true, ravi, 'Will try again tomorrow morning.'],
    ['Email', 'Sent brochure to Imran Khan', 'Khan Exports', 0, '09:45', true, ravi, 'Shared pricing and product brochure.']
  ];
  await Activity.insertMany(acts.map(([type, title, related, d, time, done, who, notes]) => ({ org: org._id, owner: who._id, type, title, related, date: day(d), time, done, notes: notes || '' })));

  const tasks = [
    ['Prepare proposal for GreenLeaf Organics', 'GreenLeaf Organics', owner, 'High', 'todo', 2],
    ['Schedule demo with Khan Exports', 'Khan Exports', ravi, 'Medium', 'todo', 4],
    ['Call Vikram Singh about reorder', 'Singh Auto Parts', ravi, 'Medium', 'todo', 0],
    ['Send onboarding pack to TechNova', 'TechNova Solutions', owner, 'High', 'progress', 1],
    ['Update price list for next year', 'Internal', ravi, 'Low', 'progress', 9],
    ['Review quote v2 for Desai Constructions', 'Desai Constructions', owner, 'High', 'review', -1],
    ['Collect GST details from Crescent Pharma', 'Crescent Pharma', owner, 'Medium', 'done', -3]
  ];
  await Task.insertMany(tasks.map(([title, account, who, priority, status, d]) => ({ org: org._id, assignee: who._id, title, account, priority, status, due: day(d), doneAt: status === 'done' ? ago(3) : undefined })));

  console.log('\nDemo data created.');
  console.log('  Login email:    ' + DEMO_EMAIL);
  console.log('  Login password: demo1234');
  console.log('  (Team member:   ravi@leadbook.test / demo1234)\n');
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('Seeding failed:', e.message);
  await mongoose.disconnect();
  process.exit(1);
});
