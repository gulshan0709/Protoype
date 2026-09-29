// The demo name pools: generated rows draw people from these (contracts/demoVolume.ts),
// and person detection knows every name in them (src/shared/people/personName.ts).
// Order matters: the seeded generators pick by index. Pure, so node tests can load it.

const words = (text: string): readonly string[] => text.split(" ");

export const INDIAN_FEMALE = words(
  "Aanya Aditi Ananya Anjali Asha Avni Diya Divya Gauri Ira Isha Ishita Kavya Kiara Meera Mira Naina Neha Nisha Pooja Priya Riya Saanvi Sana Shreya Sneha Tanvi Tara Trisha Anika Pallavi Ritika Sakshi Simran Swati Nandini Kriti Megha Kavita Anita Anaya Devika Lakshmi Radhika Shruti",
);
export const INDIAN_MALE = words(
  "Aarav Aditya Akash Amit Arjun Aryan Dev Dhruv Harsh Ishaan Kabir Karan Krish Manav Nikhil Pranav Rahul Rohan Sahil Sameer Siddharth Varun Vihaan Vikram Yash Ayaan Rishi Kunal Tushar Nitin Rajat Gaurav Abhinav Ankit Mohit Ravi Arun Deepak Suresh Manish Sanjay Imran Farhan",
);
export const INDIAN_LAST = words(
  "Sharma Verma Gupta Mehta Patel Shah Rao Nair Iyer Menon Reddy Das Sen Bose Joshi Kulkarni Deshpande Pillai Kapoor Malhotra Chopra Singh Chauhan Agarwal Bansal Saxena Mishra Pandey Tiwari Banerjee Chatterjee Ghosh Naidu Hegde Kamath Shetty Bhat Rathore Yadav Khanna Arora Sethi Dutta Krishnan Varghese Thomas Fernandes Khan Qureshi Siddiqui Desai Kumar Joseph",
);
export const WESTERN_FEMALE = words(
  "Maya Lena Lina Emma Olivia Sofia Grace Hannah Chloe Nora Ava Leah Zoe Ruby Claire Julia",
);
export const WESTERN_MALE = words(
  "Owen Liam Noah Ethan Lucas Daniel Marcus Ryan Adam Caleb Nathan Julian Leo Miles Isaac Oscar",
);
export const WESTERN_LAST = words(
  "Chen Brooks Ellis Carter Hughes Morgan Reed Foster Bennett Parker Hayes Kim Nguyen Lopez Walsh Turner",
);
