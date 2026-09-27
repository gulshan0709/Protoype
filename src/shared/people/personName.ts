// Person-name detection for demo data. Pure: no React Native imports, so node tests can load it.
export type PersonGender = "man" | "woman";
export type PersonLook = "south-asian" | "international";
export interface PersonName {
  /** Display name without honorific or UID suffix, e.g. "Kavita Rao". */
  name: string;
  /** UID or badge suffix from "Name · UID" cells, when present. */
  uid?: string;
  gender?: PersonGender;
  look?: PersonLook;
  /** Up to two uppercase initials for the fallback avatar. */
  initials: string;
}

/*
 * A person is a known first name plus a plausible surname ("Kavita Rao",
 * "Dr. Kavita Rao", "Kavita Rao · E1001"). Organisations, roles, places and
 * teams ("Customer Admin", "Dev Ops", "Metro HVAC") are rejected because their
 * first word is not a first name, or their second word is an org/role/place
 * word. The lists below are curated from every industry's demo data
 * (tests/portraits.test.cjs checks that every person-name cell resolves).
 */
const words = (text: string) => text.trim().split(/\s+/);

// Mirrors the name pools in src/domain/contracts/demoVolume.ts (the tests keep them in sync).
const INDIAN_FEMALE = words(
  "Aanya Aditi Ananya Anjali Asha Avni Diya Divya Gauri Ira Isha Ishita Kavya Kiara Meera Mira Naina Neha Nisha Pooja Priya Riya Saanvi Sana Shreya Sneha Tanvi Tara Trisha Anika Pallavi Ritika Sakshi Simran Swati Nandini Kriti Megha Kavita Anita Anaya Devika Lakshmi Radhika Shruti",
);
const INDIAN_MALE = words(
  "Aarav Aditya Akash Amit Arjun Aryan Dev Dhruv Harsh Ishaan Kabir Karan Krish Manav Nikhil Pranav Rahul Rohan Sahil Sameer Siddharth Varun Vihaan Vikram Yash Ayaan Rishi Kunal Tushar Nitin Rajat Gaurav Abhinav Ankit Mohit Ravi Arun Deepak Suresh Manish Sanjay Imran Farhan",
);
const INDIAN_LAST = words(
  "Sharma Verma Gupta Mehta Patel Shah Rao Nair Iyer Menon Reddy Das Sen Bose Joshi Kulkarni Deshpande Pillai Kapoor Malhotra Chopra Singh Chauhan Agarwal Bansal Saxena Mishra Pandey Tiwari Banerjee Chatterjee Ghosh Naidu Hegde Kamath Shetty Bhat Rathore Yadav Khanna Arora Sethi Dutta Krishnan Varghese Thomas Fernandes Khan Qureshi Siddiqui Desai Kumar Joseph",
);
const WESTERN_FEMALE = words("Maya Lena Lina Emma Olivia Sofia Grace Hannah Chloe Nora Ava Leah Zoe Ruby Claire Julia");
const WESTERN_MALE = words(
  "Owen Liam Noah Ethan Lucas Daniel Marcus Ryan Adam Caleb Nathan Julian Leo Miles Isaac Oscar",
);

// Further South Asian names, for rows added during a session and authored corpora.
const MORE_SOUTH_ASIAN_FEMALE = words(
  "Aadhya Aarohi Aarti Aishwarya Akanksha Amrita Anushka Aparna Archana Bhavna Chitra Deepa Deepika Garima Geeta Hema Ishani Jaya Jyoti Kajal Kamala Komal Kritika Latha Madhu Manisha Mansi Myra Nalini Navya Nidhi Padma Palak Payal Poonam Preeti Priyanka Rashmi Rekha Renu Riddhi Rupa Sanjana Sapna Seema Sejal Shalini Sheela Shilpa Shweta Siya Smita Sonal Sonia Sunita Suman Uma Usha Vaishnavi Vandana Vidya Yamini Zoya",
);
const MORE_SOUTH_ASIAN_MALE = words(
  "Aakash Abhishek Advait Ajay Alok Anand Aniket Anil Anish Arnav Ashish Ashok Atharv Atul Ayush Bharat Chetan Darshan Dinesh Ganesh Girish Gopal Harish Hemant Jatin Karthik Kartik Kishore Lalit Mahesh Manoj Mukesh Naveen Neeraj Pankaj Parth Pradeep Prakash Raghav Rajesh Rajiv Rakesh Ramesh Rehan Reyansh Ritesh Sachin Santosh Satish Shankar Shaurya Sumit Sunil Tanmay Tarun Uday Vijay Vinay Vinod Viraj Vishal Vivek Yogesh",
);
const MORE_SOUTH_ASIAN_LAST = words(
  "Chandra Raman Mukherjee Chakraborty Sinha Prasad Jain Bhatt Trivedi Chawla Ahuja Grover Bajaj Goel Mittal Dubey Shukla Srivastava Tripathi Thakur Gill Sandhu Dhillon Grewal Sidhu Iyengar Rajan Subramanian Venkatesh Mathur Bhatia Luthra",
);
// International first names: the authored Corporate and Retail corpora, then common extras.
const INTERNATIONAL_FEMALE = words(
  "Aaliyah Aisha Alicia Andrea Brianna Carla Catherine Dana Elena Emily Jasmine Kara Karen Keisha Laura Marisol Mei Monica Nadia Nia Nina Paula Rachel Rebecca Rosa Tanisha Tanya Tasha " +
    "Abigail Alice Amanda Amelia Amy Ana Angela Anna Ashley Beatriz Bella Camila Caroline Clara Daniela Diana Elizabeth Ella Ellie Emilia Erin Eva Fatima Fiona Gabriela Hana Helen Ines Irene Isabel Isabella Jennifer Jessica Joanna Kate Katherine Kayla Kelly Laila Lauren Layla Lily Linda Lisa Lucia Lucy Maria Mariana Megan Melissa Mia Michelle Naomi Natalie Nicole Priscilla Sara Sarah Sophia Stephanie Susan Valentina Vanessa Yasmin Yuki Zara Lucía Sofía Inés Renée",
);
const INTERNATIONAL_MALE = words(
  "Ahmed Alan Amir Andre Ben Brian Carlos Darnell Derek Diego Frank Greg Hiro Jamal James Jason Jordan Jorge Kenji Kevin Kwame Kyle Luis Luke Mark Martin Mike Neil Omar Paul Ray Robert Sam Samuel Scott Sean Tariq Tom Tomás Tuan Tyler Victor " +
    "Aaron Adrian Alexander Andrew Anthony Antonio Arthur Benjamin Brandon Charles Chris Christopher David Dylan Edward Elijah Eric Felix Gabriel George Hassan Henry Hugo Ivan Jack Jacob Javier John Jonathan Joshua Kenneth Malik Matthew Mateo Michael Mohammed Muhammad Nicholas Oliver Patrick Peter Rafael Richard Samir Sebastian Simon Stefan Stephen Steven Timothy Tomas William Yusuf José Andrés Ramón",
);

const southAsianFirst = new Set([...INDIAN_FEMALE, ...INDIAN_MALE, ...MORE_SOUTH_ASIAN_FEMALE, ...MORE_SOUTH_ASIAN_MALE]);
const southAsianLast = new Set([...INDIAN_LAST, ...MORE_SOUTH_ASIAN_LAST]);
const women = new Set([...INDIAN_FEMALE, ...MORE_SOUTH_ASIAN_FEMALE, ...WESTERN_FEMALE, ...INTERNATIONAL_FEMALE]);
const men = new Set([...INDIAN_MALE, ...MORE_SOUTH_ASIAN_MALE, ...WESTERN_MALE, ...INTERNATIONAL_MALE]);

/**
 * Words that make a "First Last" pair an organisation, role, team, place or
 * record rather than a person ("Dev Ops", "Grace Hall Lobby", "Maya Store").
 */
const NOT_SURNAME = new Set(
  words(
    "Ops Operations Operator Operators Admin Admins Administrator Administration Manager Managers Management Lead Leads Head Heads Team Teams Crew Security Office Offices Officer Officers Desk Service Services Engineering Engineer Engineers Region Regional Campus Campuses Gate Gates Block Blocks Hall Halls Room Rooms Lab Labs Laboratory Center Centre Group Groups Holdings Staffing Logistics Energy Health Store Stores Plant Plants Unit Units Yard Post Posts Reception Receptionist Warden Wardens Coordinator Coordinators Supervisor Supervisors Controller Dean Deans Faculty Support Deployment Premium Standard Enterprise Professional Pro Plus Chain Hub University Education College School Academy Department Dept Analytics Audit Agency Couriers Courier North South East West Central Main Annex Tower Wing Floor Level Line Dock Bay Zone Lobby Building Site Sites Inc Ltd Llc Corp Corporation Company Co Partners Solutions Systems Technologies Tech Media Clean Cleaning Fiber Glass Elevator Carting Payroll Finance Legal Facilities Facility Maintenance Quality Safety Visitor Visitors Staff Guard Guards Shift Shifts Night Day Morning Evening Customer Customers Client Clients User Users Profile Profiles Capture Captures Row Rows Import Watchlist Unknown Family Party People Person Persons Contractor Contractors Vendor Vendors Employee Employees Learner Learners Student Students Resident Residents Hostel Hostels Library Entrance Exit Parking Garage Dispatch Warehouse Distribution Retail Manufacturing Corporate Industrial Components Fleet Freight Transport Express Motors Works Mart Market Foods Pharma Bank Capital Trust Council Board Committee Station Point Portal App Platform Console Cloud Network Networks Data Video Camera Cameras Sensor Sensors Access Attendance Presence Shield Insights Tour Tours Patrol Route Round Checkpoint Pass Passes Badge Card Pilot Program Programs Project Review Policy Policies Rules Report Reports Template Templates Integration Integrations Test Demo Sample Default Draft Pending Approved Rejected Active Inactive Open Closed Critical High Medium Low Normal Today Tomorrow Yesterday Weekly Daily Monthly Monday Tuesday Wednesday Thursday Friday Saturday Sunday Office Affairs Services Research Strategy Treasury Experience Directory Registry Registrar Admissions Accounts Sales Marketing Procurement Compliance Privacy Risk Response Command Control Dashboard Monitor Monitoring Alerts Alert Incident Incidents Case Cases Queue Log Logs",
  ),
);
const HONORIFIC = /^(?:Dr|Prof|Mr|Mrs|Ms|Mx)\.?\s+/;
const PARTICLES = new Set(words("de da del della der di du la le van von bin al el"));
const INITIAL = /^\p{Lu}\.$/u;
/** A capitalised surname word: "Rao", "O'Connell", "McAllister", "Smith-Jones", "García". */
const SURNAME = /^\p{Lu}[\p{L}'’]*\p{Ll}(?:-\p{Lu}[\p{L}'’]*\p{Ll})?$/u;
const ID_SUFFIX = /^[A-Z]*-?\d[\w-]*$/i;

const surnameOk = (word: string) => SURNAME.test(word) && !NOT_SURNAME.has(word) && !NOT_SURNAME.has(word.split("-")[0]);

/** Gender of a known first name ("Kavita" -> "woman"); undefined when the name is not in the lists. */
export function firstNameGender(first: string): PersonGender | undefined {
  return women.has(first) ? "woman" : men.has(first) ? "man" : undefined;
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * A person when the text is a (possibly titled) name, optionally followed by " · UID";
 * undefined for organisations, roles and places. Every person has a gender and a look:
 * from the first name, or for initial forms ("K. Nair") a stable pick from the name.
 */
export function parsePersonName(text: string): PersonName | undefined {
  const [head = "", suffix] = String(text ?? "")
    .trim()
    .split(/\s+·\s+/);
  const tokens = words(head.replace(HONORIFIC, ""));
  if (tokens.length < 2 || tokens.length > 4) return undefined;
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  const middle = tokens.slice(1, -1);
  if (!middle.every((w) => PARTICLES.has(w) || INITIAL.test(w) || surnameOk(w))) return undefined;
  const name = tokens.join(" ");
  let gender = firstNameGender(first);
  let look: PersonLook;
  if (gender) {
    // "Kavita Rao", "Kavita R."
    if (!(surnameOk(last) || (INITIAL.test(last) && tokens.length === 2))) return undefined;
    look = southAsianFirst.has(first) || southAsianLast.has(last) ? "south-asian" : "international";
  } else if (INITIAL.test(first) && tokens.length === 2 && surnameOk(last)) {
    // "K. Nair": the first name is unknown, so the demo picks a gender from the whole name
    // (the same name always gets the same one); the look follows the surname.
    gender = (hash(name) >>> 7) % 2 ? "woman" : "man";
    look = southAsianLast.has(last) ? "south-asian" : "international";
  } else return undefined;
  const id = suffix?.replace(/^(?:UID|Badge)\s*/i, "");
  const person: PersonName = { name, initials: (first[0] + last[0]).toUpperCase(), gender, look };
  if (id && ID_SUFFIX.test(id)) person.uid = id;
  return person;
}
