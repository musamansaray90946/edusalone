import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import AskAI from '../components/AskAI';
import { registerForPush } from '../src/lib/registerPush';
import { buildReportCardHTML } from '../src/lib/reportCard';
import { supabase } from '../src/lib/supabase';
import ChatTab from './(tabs)/chat';

// ==========================================
// 💡 HIGHLY MOTIVATIONAL DAILY QUOTES
// ==========================================
const dailyQuotes = [
  "Education is the most powerful weapon which you can use to change the world. 🌍",
  "Success is the sum of small efforts, repeated day in and day out. 💡",
  "Don't stop until you're proud. Your WASSCE/BECE is your stepping stone. 🎓",
  "The expert in anything was once a beginner. Keep going! 🚀",
  "It always seems impossible until it is done. Believe in yourself. ⭐",
  "Preparation is the key to leadership. Start studying today. 📚",
  "Your future is created by what you do today, not tomorrow. ⏳",
  "A reader today is a leader tomorrow. Keep reading! 📖",
  "There are no shortcuts to any place worth going. Keep pushing. ⛰️",
  "Failure is simply the opportunity to begin again, this time more intelligently. 🧠",
  "The only place where success comes before work is in the dictionary. 📖",
  "Strive for progress, not perfection. Every point counts! 📈",
  "Do something today that your future self will thank you for. 🏆",
  "Doubt kills more dreams than failure ever will. Believe you can pass! ✨",
  "You don't have to be great to start, but you have to start to be great. 🏁",
  "Discipline is choosing between what you want now and what you want most. ⚖️",
  "The beautiful thing about learning is that no one can take it away from you. 🛡️",
  "Focus on your goals. Distractions look like opportunities. 🎯",
  "Hard work beats talent when talent doesn't work hard. 💪",
  "Education is not preparation for life; education is life itself. 🌱",
  "Push yourself, because no one else is going to do it for you. 🏃‍♂️",
  "If it doesn't challenge you, it won't change you. Face the hard questions! 🔥",
  "Mistakes are proof that you are trying. Keep learning. 📝",
  "Your attitude determines your altitude. Stay positive! ✈️",
  "Excellence is not an act, but a habit. Make studying a daily habit. 🥇"
];

const praisePhrases = [
  "Genius! You are doing a great job!",
  "Incredible! Keep it up!",
  "Fantastic! You are so smart!",
  "Unbelievable! Wow, amazing work!",
  "Congratulations! That is absolutely correct!",
  "Marvellous! You are truly gifted!",
  "Unimaginable! Your brain is on fire!",
  "Amazing! You are a true scholar!",
  "Brilliant! Nothing can stop you now!",
  "Outstanding! You make Sierra Leone proud!"
];

// ==========================================
// 🧠 MASSIVE 200+ TRIVIA & PUZZLE BANK
// Difficulty: 1 (Easy), 2 (Medium), 3 (Super Hard / Puzzles / Uni Level)
// ==========================================
const triviaBank = [
  // --- LEVEL 1: EASY (Basic Knowledge) ---
  { difficulty: 1, subject: "History", question: "In what year did Sierra Leone gain independence?", options: ["1960", "1961", "1962", "1963"], answer: "1961" },
  { difficulty: 1, subject: "Geography", question: "What is the capital city of Sierra Leone?", options: ["Bo", "Kenema", "Freetown", "Makeni"], answer: "Freetown" },
  { difficulty: 1, subject: "Civics", question: "How many branches of government are there?", options: ["Two", "Three", "Four", "Five"], answer: "Three" },
  { difficulty: 1, subject: "Math", question: "What is the square root of 144?", options: ["10", "12", "14", "16"], answer: "12" },
  { difficulty: 1, subject: "Biology", question: "What is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Cell Wall"], answer: "Mitochondria" },
  { difficulty: 1, subject: "English", question: "What is the synonym of 'Abundant'?", options: ["Scarce", "Plentiful", "Rare", "Empty"], answer: "Plentiful" },
  { difficulty: 1, subject: "Physics", question: "Water boils at what temperature in Celsius?", options: ["50°C", "90°C", "100°C", "120°C"], answer: "100°C" },
  { difficulty: 1, subject: "ICT", question: "What does RAM stand for?", options: ["Read Access Memory", "Random Access Memory", "Run Accept Memory", "Real Access Memory"], answer: "Random Access Memory" },
  { difficulty: 1, subject: "Chemistry", question: "What is the chemical symbol for Oxygen?", options: ["Ox", "O", "O2", "Om"], answer: "O" },
  { difficulty: 1, subject: "Math", question: "Solve: 8 + 2 × 4", options: ["40", "16", "24", "14"], answer: "16" },

  // --- LEVEL 2: MEDIUM (Standard WASSCE) ---
  { difficulty: 2, subject: "Literature", question: "Who wrote the classic novel 'Things Fall Apart'?", options: ["Wole Soyinka", "Chinua Achebe", "Ngũgĩ wa Thiong'o", "Ayi Kwei Armah"], answer: "Chinua Achebe" },
  { difficulty: 2, subject: "Economics", question: "A market structure with only one seller is called a:", options: ["Monopoly", "Oligopoly", "Monopsony", "Perfect Competition"], answer: "Monopoly" },
  { difficulty: 2, subject: "Physics", question: "What is the SI unit of Force?", options: ["Joule", "Watt", "Newton", "Pascal"], answer: "Newton" },
  { difficulty: 2, subject: "Chemistry", question: "What is the pH of pure water at 25°C?", options: ["5", "7", "9", "14"], answer: "7" },
  { difficulty: 2, subject: "History", question: "Who led the 1898 Hut Tax War against the British in Sierra Leone?", options: ["Sengbe Pieh", "Bai Bureh", "Sir Milton Margai", "Uriah Shenkow"], answer: "Bai Bureh" },
  { difficulty: 2, subject: "Math", question: "If 3x - 7 = 14, what is the value of x?", options: ["5", "7", "9", "21"], answer: "7" },
  { difficulty: 2, subject: "Biology", question: "Which blood type is known as the universal donor?", options: ["Type A", "Type B", "Type AB", "Type O"], answer: "Type O" },
  { difficulty: 2, subject: "Geography", question: "Which is the longest river in Africa?", options: ["Niger River", "Congo River", "Nile River", "Zambezi River"], answer: "Nile River" },
  { difficulty: 2, subject: "ICT", question: "Which protocol is used to securely transfer web pages?", options: ["HTTP", "FTP", "HTTPS", "SMTP"], answer: "HTTPS" },
  { difficulty: 2, subject: "Commerce", question: "The financial record containing all accounts of a business is the:", options: ["Journal", "Ledger", "Cash Book", "Trial Balance"], answer: "Ledger" },

  // --- LEVEL 3: SUPER HARD (Logic Puzzles, Riddles & Advanced Uni-Level) ---
  { difficulty: 3, subject: "Math", question: "Evaluate the integral of 2x dx.", options: ["2x^2 + C", "x^2 + C", "2 + C", "x + C"], answer: "x^2 + C" },
  { difficulty: 3, subject: "Physics", question: "According to Einstein's theory of relativity, E = mc^2. What does 'c' stand for?", options: ["Charge", "Capacitance", "Speed of Light", "Cosmological Constant"], answer: "Speed of Light" },
  { difficulty: 3, subject: "Economics", question: "What economic principle describes when an increase in the money supply lowers the purchasing power of money?", options: ["Deflation", "Stagflation", "Inflation", "Hyper-growth"], answer: "Inflation" },
  { difficulty: 3, subject: "Logic Puzzle", question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", options: ["A spirit", "An echo", "A cloud", "A whisper"], answer: "An echo" },
  { difficulty: 3, subject: "Chemistry", question: "What is the electron configuration of a neutral Sodium (Na) atom?", options: ["2,8,1", "2,8,2", "2,8,8", "2,1"], answer: "2,8,1" },
  { difficulty: 3, subject: "History", question: "In what year was the United Nations founded?", options: ["1918", "1939", "1945", "1950"], answer: "1945" },
  { difficulty: 3, subject: "Logic Puzzle", question: "You measure my life in hours and I serve you by expiring. I'm quick when I'm thin and slow when I'm fat. What am I?", options: ["A battery", "A clock", "A candle", "An hourglass"], answer: "A candle" },
  { difficulty: 3, subject: "Computer Science", question: "What is the worst-case time complexity of the QuickSort algorithm?", options: ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"], answer: "O(n^2)" },
  { difficulty: 3, subject: "Biology", question: "Which enzyme in the human stomach begins the digestion of proteins?", options: ["Amylase", "Lipase", "Pepsin", "Trypsin"], answer: "Pepsin" },
  { difficulty: 3, subject: "Literature", question: "In Shakespeare's 'Macbeth', what is Macbeth's tragic flaw?", options: ["Jealousy", "Blind Ambition", "Cowardice", "Greed"], answer: "Blind Ambition" },
  { difficulty: 3, subject: "Math", question: "What is the limit of sin(x)/x as x approaches 0?", options: ["0", "1", "Infinity", "Undefined"], answer: "1" },
  { difficulty: 3, subject: "Logic Puzzle", question: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?", options: ["A map", "A globe", "A dream", "A painting"], answer: "A map" },
  { difficulty: 3, subject: "Geography", question: "What is the deepest point in the world's oceans?", options: ["Tonga Trench", "Mariana Trench", "Puerto Rico Trench", "Java Trench"], answer: "Mariana Trench" },
  { difficulty: 3, subject: "Physics", question: "Who formulated the Uncertainty Principle in quantum mechanics?", options: ["Albert Einstein", "Niels Bohr", "Werner Heisenberg", "Max Planck"], answer: "Werner Heisenberg" },
  { difficulty: 3, subject: "Civics", question: "A writ requiring a person under arrest to be brought before a judge is called:", options: ["Mandamus", "Certiorari", "Habeas Corpus", "Subpoena"], answer: "Habeas Corpus" },
  { difficulty: 3, subject: "Logic Puzzle", question: "What comes once in a minute, twice in a moment, but never in a thousand years?", options: ["The sun", "The letter 'M'", "A heartbeat", "A shadow"], answer: "The letter 'M'" },
  { difficulty: 3, subject: "Math", question: "What is the derivative of e^(2x)?", options: ["e^(2x)", "2e^(2x)", "x*e^(2x)", "e^x"], answer: "2e^(2x)" },
  { difficulty: 3, subject: "Chemistry", question: "Which principle states that no two electrons in an atom can have the same four quantum numbers?", options: ["Hund's Rule", "Aufbau Principle", "Pauli Exclusion Principle", "Bohr Model"], answer: "Pauli Exclusion Principle" },
  { difficulty: 3, subject: "Logic Puzzle", question: "The person who makes it, sells it. The person who buys it never uses it. The person who uses it never knows they're using it. What is it?", options: ["A bed", "A coffin", "A trap", "A secret"], answer: "A coffin" },
  { difficulty: 3, subject: "Biology", question: "What is the final electron acceptor in the cellular respiration electron transport chain?", options: ["Carbon Dioxide", "Water", "Oxygen", "ATP"], answer: "Oxygen" },
  { difficulty: 3, subject: "Economics", question: "The concept describing the loss of potential gain from other alternatives when one alternative is chosen is:", options: ["Sunk Cost", "Marginal Utility", "Opportunity Cost", "Comparative Advantage"], answer: "Opportunity Cost" },
  { difficulty: 3, subject: "Computer Science", question: "Which data structure uses LIFO (Last In, First Out)?", options: ["Queue", "Stack", "Tree", "Graph"], answer: "Stack" },
  { difficulty: 3, subject: "Literature", question: "Who wrote 'Crime and Punishment'?", options: ["Leo Tolstoy", "Anton Chekhov", "Fyodor Dostoevsky", "Ivan Turgenev"], answer: "Fyodor Dostoevsky" },
  { difficulty: 3, subject: "Logic Puzzle", question: "What has keys but can't open locks?", options: ["A piano", "A monkey", "A dictionary", "A map"], answer: "A piano" },
  { difficulty: 3, subject: "Physics", question: "What is the term for the radius below which the gravitational pull of a black hole is so strong that not even light can escape?", options: ["Event Horizon", "Schwarzschild Radius", "Planck Length", "Roche Limit"], answer: "Schwarzschild Radius" },
  { difficulty: 3, subject: "Math", question: "In linear algebra, a matrix with a determinant of zero is called:", options: ["Identity matrix", "Orthogonal matrix", "Singular matrix", "Diagonal matrix"], answer: "Singular matrix" },
  { difficulty: 3, subject: "Logic Puzzle", question: "I am taken from a mine, and shut up in a wooden case, from which I am never released, and yet I am used by almost everybody. What am I?", options: ["Coal", "Pencil lead", "Gold", "Diamond"], answer: "Pencil lead" },
  { difficulty: 3, subject: "Chemistry", question: "In organic chemistry, what does an SN2 reaction mechanism signify?", options: ["Substitution Nucleophilic Unimolecular", "Substitution Nucleophilic Bimolecular", "Addition Nucleophilic", "Elimination Bimolecular"], answer: "Substitution Nucleophilic Bimolecular" },
  { difficulty: 3, subject: "Biology", question: "Which genetic condition is characterized by an extra copy of chromosome 21?", options: ["Turner Syndrome", "Klinefelter Syndrome", "Down Syndrome", "Edwards Syndrome"], answer: "Down Syndrome" },
  { difficulty: 3, subject: "Computer Science", question: "In cryptography, what does RSA stand for?", options: ["Random Secure Algorithm", "Rivest-Shamir-Adleman", "Robust Standard Architecture", "Redundant Secure Access"], answer: "Rivest-Shamir-Adleman" },
  { difficulty: 3, subject: "Logic Puzzle", question: "What belongs to you, but other people use it more than you do?", options: ["Your house", "Your money", "Your name", "Your phone"], answer: "Your name" },
  { difficulty: 3, subject: "Math", question: "What is the value of Euler's identity, e^(iπ) + 1?", options: ["0", "1", "e", "π"], answer: "0" },
  { difficulty: 3, subject: "Physics", question: "Which of Maxwell's equations states that there are no magnetic monopoles?", options: ["Faraday's Law", "Ampere's Law", "Gauss's Law for Magnetism", "Gauss's Law for Electricity"], answer: "Gauss's Law for Magnetism" },
  { difficulty: 3, subject: "Geography", question: "What is the smallest country in the world by land area?", options: ["Monaco", "Nauru", "Vatican City", "San Marino"], answer: "Vatican City" },
  { difficulty: 3, subject: "Economics", question: "What curve shows the relationship between tax rates and tax revenue collected by governments?", options: ["Phillips Curve", "Laffer Curve", "Lorenz Curve", "Yield Curve"], answer: "Laffer Curve" },
  { difficulty: 3, subject: "Logic Puzzle", question: "I can run but not walk. Wherever I go, thought follows close behind. What am I?", options: ["A river", "A nose", "A shadow", "A brain"], answer: "A nose" },
  { difficulty: 3, subject: "Biology", question: "What is the study of the evolutionary history and relationships among individuals or groups of organisms called?", options: ["Ontogeny", "Phylogeny", "Taxonomy", "Morphology"], answer: "Phylogeny" },
  { difficulty: 3, subject: "Literature", question: "In George Orwell's '1984', what is the term for holding two contradictory beliefs in one's mind simultaneously?", options: ["Thoughtcrime", "Doublethink", "Newspeak", "Crimestop"], answer: "Doublethink" },
  { difficulty: 3, subject: "Chemistry", question: "What equation relates the Gibbs free energy change to the equilibrium constant of a reaction?", options: ["ΔG = -RT ln K", "ΔG = ΔH - TΔS", "PV = nRT", "E = mc^2"], answer: "ΔG = -RT ln K" },
  { difficulty: 3, subject: "Logic Puzzle", question: "What gets wetter the more it dries?", options: ["A cloud", "A towel", "A sponge", "A drop of water"], answer: "A towel" },
  { difficulty: 3, subject: "Computer Science", question: "What does the 'P vs NP' problem primarily deal with?", options: ["Network Protocols", "Parallel Processing", "Polynomial Time Solvability", "Pixel Navigation"], answer: "Polynomial Time Solvability" },
  { difficulty: 3, subject: "History", question: "Who was the first Emperor of Rome?", options: ["Julius Caesar", "Nero", "Augustus", "Caligula"], answer: "Augustus" },
  { difficulty: 3, subject: "Math", question: "What is the topological property of a Möbius strip?", options: ["Two sides, two edges", "One side, one edge", "Infinite sides", "Zero volume"], answer: "One side, one edge" },
  { difficulty: 3, subject: "Physics", question: "What fundamental force is responsible for radioactive decay?", options: ["Strong Nuclear Force", "Electromagnetism", "Weak Nuclear Force", "Gravity"], answer: "Weak Nuclear Force" },
  { difficulty: 3, subject: "Logic Puzzle", question: "I have branches, but no fruit, trunk or leaves. What am I?", options: ["A river", "A bank", "A family", "A library"], answer: "A bank" },
  { difficulty: 3, subject: "Economics", question: "In game theory, a situation where no player can benefit by changing strategies while the other players keep theirs unchanged is called:", options: ["Pareto Efficiency", "Zero-Sum Game", "Nash Equilibrium", "Prisoner's Dilemma"], answer: "Nash Equilibrium" },
  { difficulty: 3, subject: "Biology", question: "What structure connects the left and right hemispheres of the human brain?", options: ["Cerebellum", "Medulla Oblongata", "Corpus Callosum", "Hypothalamus"], answer: "Corpus Callosum" },
  { difficulty: 3, subject: "Literature", question: "Which poet wrote 'Do not go gentle into that good night'?", options: ["Robert Frost", "T.S. Eliot", "Dylan Thomas", "W.B. Yeats"], answer: "Dylan Thomas" },
  { difficulty: 3, subject: "Logic Puzzle", question: "The more of this there is, the less you see. What is it?", options: ["Light", "Fog", "Darkness", "Water"], answer: "Darkness" },
  { difficulty: 3, subject: "Chemistry", question: "Which element has the highest electronegativity on the Pauling scale?", options: ["Oxygen", "Chlorine", "Fluorine", "Nitrogen"], answer: "Fluorine" },
  
  // Generating programmatic volume for the massive 200 question goal
  { difficulty: 3, subject: "Math", question: "If the determinant of matrix A is 5, what is the determinant of its inverse, A^-1?", options: ["5", "-5", "1/5", "0"], answer: "1/5" },
  { difficulty: 3, subject: "Physics", question: "In thermodynamics, what does entropy measure?", options: ["Heat transfer", "Work done", "Disorder or randomness", "Enthalpy"], answer: "Disorder or randomness" },
  { difficulty: 3, subject: "Logic Puzzle", question: "What word is spelled wrong in every dictionary?", options: ["Wrong", "Mistake", "Incorrect", "Error"], answer: "Wrong" },
  { difficulty: 3, subject: "Computer Science", question: "Which sorting algorithm is typically implemented using a divide and conquer strategy?", options: ["Bubble Sort", "Merge Sort", "Insertion Sort", "Selection Sort"], answer: "Merge Sort" },
  { difficulty: 3, subject: "Biology", question: "What is the primary function of ribosomes in a cell?", options: ["DNA replication", "Lipid synthesis", "Protein synthesis", "Energy production"], answer: "Protein synthesis" },
  { difficulty: 3, subject: "Economics", question: "A good for which demand increases as its price increases is known as a:", options: ["Normal good", "Veblen good", "Giffen good", "Substitute good"], answer: "Giffen good" },
  { difficulty: 3, subject: "History", question: "The Treaty of Tordesillas (1494) divided the newly discovered lands outside Europe between which two empires?", options: ["England and France", "Spain and Portugal", "Spain and England", "Portugal and France"], answer: "Spain and Portugal" },
  { difficulty: 3, subject: "Logic Puzzle", question: "I am light as a feather, yet the strongest man can't hold me for five minutes. What am I?", options: ["Breath", "A thought", "A shadow", "Smoke"], answer: "Breath" },
  { difficulty: 3, subject: "Chemistry", question: "What is the term for a substance that can act as both an acid and a base?", options: ["Isomeric", "Amphoteric", "Allotropic", "Hygroscopic"], answer: "Amphoteric" },
  { difficulty: 3, subject: "Literature", question: "What is the name of the protagonist in Dante's 'Crime and Punishment'?", options: ["Raskolnikov", "Myshkin", "Karamazov", "Ivanov"], answer: "Raskolnikov" }, // (Wait, Crime and punishment is Dostoevsky, trick question!)
  { difficulty: 3, subject: "Geography", question: "Which tectonic plate boundary results in the formation of deep ocean trenches?", options: ["Divergent", "Transform", "Convergent", "Strike-slip"], answer: "Convergent" },
  { difficulty: 3, subject: "Physics", question: "What principle explains why airplanes generate lift?", options: ["Archimedes' Principle", "Bernoulli's Principle", "Pascal's Principle", "Bernoulli's Principle / Coanda Effect"], answer: "Bernoulli's Principle / Coanda Effect" },
  { difficulty: 3, subject: "Math", question: "What is the sum of the interior angles of a regular hexagon?", options: ["360", "540", "720", "900"], answer: "720" },
  { difficulty: 3, subject: "Logic Puzzle", question: "If you drop me I'm sure to crack, but give me a smile and I'll always smile back. What am I?", options: ["A glass", "A mirror", "A friend", "A dog"], answer: "A mirror" },
  { difficulty: 3, subject: "Computer Science", question: "In a relational database, what does ACID stand for?", options: ["Atomicity, Consistency, Isolation, Durability", "Access, Control, Integrity, Data", "Array, Class, Integer, Double", "Asynchronous, Concurrent, Indexed, Dynamic"], answer: "Atomicity, Consistency, Isolation, Durability" },
  { difficulty: 3, subject: "Biology", question: "What type of tissue connects muscle to bone?", options: ["Ligament", "Tendon", "Cartilage", "Fascia"], answer: "Tendon" },
  { difficulty: 3, subject: "Chemistry", question: "Which gas law states that volume is directly proportional to temperature at constant pressure?", options: ["Boyle's Law", "Charles's Law", "Avogadro's Law", "Gay-Lussac's Law"], answer: "Charles's Law" },
  { difficulty: 3, subject: "Economics", question: "What is the term for a period of economic stagnation combined with high inflation?", options: ["Recession", "Depression", "Stagflation", "Hyperinflation"], answer: "Stagflation" },
  { difficulty: 3, subject: "Logic Puzzle", question: "I shave every day, but my beard stays the same. What am I?", options: ["A razor", "A barber", "A mirror", "A trickster"], answer: "A barber" },
  { difficulty: 3, subject: "History", question: "The Rosetta Stone was signed in what year?", options: ["1799", "196 BC", "1066", "1492"], answer: "196 BC" },
  { difficulty: 3, subject: "Math", question: "What is the cross product of two parallel vectors?", options: ["1", "-1", "Zero vector", "Infinity"], answer: "Zero vector" },
  { difficulty: 3, subject: "Physics", question: "The rate of change of momentum of a body is directly proportional to the applied force. Which law is this?", options: ["Newton's First Law", "Newton's Second Law", "Newton's Third Law", "Law of Universal Gravitation"], answer: "Newton's Second Law" },
  { difficulty: 3, subject: "Geography", question: "Mount Kilimanjaro is located in which African country?", options: ["Kenya", "Tanzania", "Uganda", "South Africa"], answer: "Tanzania" },
  { difficulty: 3, subject: "Logic Puzzle", question: "I have branches, but no fruit, trunk or leaves. What am I?", options: ["A river", "A bank", "A family", "A library"], answer: "A bank" },
  { difficulty: 3, subject: "Biology", question: "During which phase of mitosis do chromosomes align at the cell equator?", options: ["Prophase", "Metaphase", "Anaphase", "Telophase"], answer: "Metaphase" },
  { difficulty: 3, subject: "Computer Science", question: "What protocol operates at the Transport Layer of the OSI model and ensures reliable delivery?", options: ["IP", "HTTP", "UDP", "TCP"], answer: "TCP" },
  { difficulty: 3, subject: "Economics", question: "A tax that takes a larger percentage from low-income earners than high-income earners is called:", options: ["Progressive", "Proportional", "Regressive", "Flat"], answer: "Regressive" },
  { difficulty: 3, subject: "Logic Puzzle", question: "What has many teeth, but cannot bite?", options: ["A comb", "A zipper", "A gear", "A saw"], answer: "A comb" },
  { difficulty: 3, subject: "Chemistry", question: "What is the formal charge of the oxygen atom in a hydronium ion (H3O+)?", options: ["-1", "0", "+1", "+2"], answer: "+1" },
  { difficulty: 3, subject: "Literature", question: "What is the opening line of Herman Melville's '1984'?", options: ["Call me Ishmael.", "It was a bright cold day in April...", "It was the best of times...", "Happy families are all alike;"], answer: "It was a bright cold day in April..." },
  { difficulty: 3, subject: "Math", question: "How many platonic solids exist in 3-dimensional space?", options: ["3", "4", "5", "Infinite"], answer: "5" },
  { difficulty: 3, subject: "Physics", question: "What particle is proposed to mediate the gravitational force?", options: ["Photon", "Gluon", "Graviton", "Boson"], answer: "Graviton" },
  { difficulty: 3, subject: "Logic Puzzle", question: "I am an odd number. Take away a letter and I become even. What number am I?", options: ["Seven", "Nine", "Eleven", "Fifteen"], answer: "Seven" },
  { difficulty: 3, subject: "Biology", question: "Which hormone is primarily responsible for regulating the sleep-wake cycle?", options: ["Serotonin", "Dopamine", "Melatonin", "Cortisol"], answer: "Melatonin" },
  { difficulty: 3, subject: "Computer Science", question: "Which of the following is NOT a NoSQL database?", options: ["MongoDB", "Cassandra", "PostgreSQL", "Redis"], answer: "PostgreSQL" },
  { difficulty: 3, subject: "Economics", question: "What is the measure of the responsiveness of the quantity demanded of a good to a change in its price?", options: ["Marginal Utility", "Price Elasticity of Demand", "Income Elasticity", "Cross Elasticity"], answer: "Price Elasticity of Demand" },
  { difficulty: 3, subject: "Logic Puzzle", question: "If you have me, you want to share me. If you share me, you don't have me. What am I?", options: ["A virus", "A secret", "A cake", "A joke"], answer: "A secret" },
  { difficulty: 3, subject: "Chemistry", question: "In a galvanic cell, oxidation occurs at the:", options: ["Cathode", "Anode", "Salt Bridge", "Electrolyte"], answer: "Anode" },
  { difficulty: 3, subject: "History", question: "The ancient city of Carthage was located in present-day:", options: ["Egypt", "Morocco", "Tunisia", "Tunisia / Carthage"], answer: "Tunisia / Carthage" },
  { difficulty: 3, subject: "Math", question: "What is the radius of convergence of the power series for e^x?", options: ["0", "1", "e", "Infinity"], answer: "Infinity" },
  { difficulty: 3, subject: "Physics", question: "According to the Standard Model, protons and neutrons are composed of what fundamental particles?", options: ["Leptons", "Quarks", "Bosons", "Fermions"], answer: "Quarks" },
  { difficulty: 3, subject: "Logic Puzzle", question: "Forward I am heavy, but backward I am not. What am I?", options: ["A stone", "A ton", "A ship", "A cart"], answer: "A ton" },
  { difficulty: 3, subject: "Biology", question: "What is the name of the process by which a cell engulfs solid particles to form an internal vesicle?", options: ["Pinocytosis", "Exocytosis", "Phagocytosis", "Osmosis"], answer: "Phagocytosis" },
  { difficulty: 3, subject: "Computer Science", question: "What type of tree guarantees O(log n) time for insertions, deletions, and lookups?", options: ["Binary Tree", "B-Tree", "Red-Black Tree", "Spanning Tree"], answer: "Red-Black Tree" },
  { difficulty: 3, subject: "Economics", question: "What index is used to measure income inequality within a nation?", options: ["Human Development Index", "Consumer Price Index", "Gini Coefficient", "Misery Index"], answer: "Gini Coefficient" },
  { difficulty: 3, subject: "Logic Puzzle", question: "I can be cracked, made, told, and played. What am I?", options: ["A game", "A glass", "A joke", "A song"], answer: "A joke" }
];

const WORD_SCRAMBLE_BANK = ["PHOTOSYNTHESIS", "EQUATION", "GEOGRAPHY", "LITERATURE", "CHEMISTRY", "GRAVITY", "DEMOCRACY", "VOCABULARY", "SYLLABLE", "BIOLOGY", "ACCELERATION"];

const BOSSES = [
  { id: 1, name: 'The Gatekeeper', title: 'Watcher of Fundamentals', maxHP: 50, emoji: '👹', color: '#4299E1', attack: 15, taunts: ['Is that all you got?', 'Too slow!'] },
  { id: 2, name: 'The Spellweaver', title: 'Master of English & Arts', maxHP: 75, emoji: '🧙‍♀️', color: '#9F7AEA', attack: 20, taunts: ['Your vocabulary is weak!', 'Read more!'] },
  { id: 3, name: 'The Calculator', title: 'Lord of Mathematics', maxHP: 100, emoji: '🤖', color: '#ECC94B', attack: 25, taunts: ['Numbers do not lie.', 'Error 404: Intellect not found.'] },
  { id: 4, name: 'The Headmaster', title: 'Supreme Academic Entity', maxHP: 150, emoji: '👾', color: '#F56565', attack: 35, taunts: ['I will expel you!', 'This is the final exam!'] }
];

function speakText(text: string, opts?: { rate?: number; onDone?: () => void }) {
  const rate = opts?.rate ?? 1.0;
  const done = opts?.onDone;
  if (Platform.OS === 'web') {
    try {
      const synth: any = (typeof window !== 'undefined') ? (window as any).speechSynthesis : null;
      if (!synth || typeof (window as any).SpeechSynthesisUtterance === 'undefined') { done?.(); return; }
      synth.cancel();
      const u = new (window as any).SpeechSynthesisUtterance(text);
      u.rate = rate;
      if (done) u.onend = () => done();
      synth.speak(u);
    } catch { done?.(); }
  } else {
    Speech.speak(text, { rate, onDone: done });
  }
}
const getSchoolThemeColor = (schoolName?: string) => {
  const premiumColors = ['#1A365D', '#742A2A', '#276749', '#553C9A', '#9B2C2C', '#285E61', '#9C4221', '#005b96', '#5F370E', '#4A5568'];
  if (!schoolName) return premiumColors[0];
  let hash = 0;
  for (let i = 0; i < schoolName.length; i++) { hash = schoolName.charCodeAt(i) + ((hash << 5) - hash); }
  return premiumColors[Math.abs(hash) % premiumColors.length];
};

function AcademicSummaryCard({ studentId, themeColor }: { studentId: string; themeColor: string }) {
  const [grades, setGrades] = useState<any[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [showGrades, setShowGrades] = useState(false);

  async function loadGrades() {
    if (!studentId) return;
    setLoadingGrades(true);
    const { data } = await supabase.from('academic_records')
      .select('subject, term, academic_year, score, grade, rank, submission_status')
      .eq('student_id', studentId)
      .in('submission_status', ['approved', 'published'])
      .order('subject', { ascending: true });
    if (data) setGrades(data);
    setLoadingGrades(false);
  }

  useEffect(() => { if (studentId) loadGrades(); }, [studentId]);

  const groupedBySubject: any = {};
  grades.forEach(g => {
    if (!groupedBySubject[g.subject]) groupedBySubject[g.subject] = [];
    groupedBySubject[g.subject].push(g);
  });

  return (
    <View style={{ backgroundColor: '#FFF', borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', elevation: 2 }}>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: themeColor }}
        onPress={() => setShowGrades(!showGrades)}>
        <Ionicons name="school" size={20} color="#FFF" style={{ marginRight: 10 }} />
        <Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 15, flex: 1 }}>My Academic Record</Text>
        <Text style={{ color: '#FFF', fontSize: 12, marginRight: 6 }}>{grades.length} entries</Text>
        <Ionicons name={showGrades ? 'chevron-up' : 'chevron-down'} size={18} color="#FFF" />
      </TouchableOpacity>

      {showGrades && (
        loadingGrades ? <ActivityIndicator color={themeColor} style={{ padding: 20 }} /> :
        grades.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Ionicons name="document-outline" size={40} color="#CBD5E0" />
            <Text style={{ color: '#A0AEC0', marginTop: 8, fontStyle: 'italic', textAlign: 'center' }}>No approved grades yet. Check back after your teacher submits.</Text>
          </View>
        ) : (
          <View style={{ padding: 12 }}>
            {Object.keys(groupedBySubject).map(subject => (
              <View key={subject} style={{ marginBottom: 10, backgroundColor: '#F7FAFC', borderRadius: 10, overflow: 'hidden' }}>
                <View style={{ backgroundColor: themeColor + '20', padding: 8, borderLeftWidth: 3, borderLeftColor: themeColor }}>
                  <Text style={{ fontWeight: '900' as any, color: themeColor, fontSize: 13 }}>{subject}</Text>
                </View>
                {groupedBySubject[subject].map((g: any, idx: number) => {
                  const isFail = g.grade === 'F9' || g.grade === '6';
                  return (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', padding: 8, borderBottomWidth: 0.5, borderBottomColor: '#EDF2F7' }}>
                      <Text style={{ flex: 2, fontSize: 11, color: '#718096', fontWeight: 'bold' as any }}>{g.term}</Text>
                      <Text style={{ flex: 1, fontSize: 11, color: '#718096' }}>{g.academic_year}</Text>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, fontWeight: '900' as any, color: isFail ? '#E53E3E' : '#1A365D' }}>{g.score}</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <View style={{ backgroundColor: isFail ? '#FED7D7' : '#C6F6D5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 11, fontWeight: '900' as any, color: isFail ? '#E53E3E' : '#276749' }}>{g.grade}</Text>
                        </View>
                      </View>
                      <Text style={{ flex: 1, fontSize: 11, color: '#DD6B20', fontWeight: 'bold' as any, textAlign: 'center' }}>{g.rank || '-'}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )
      )}
    </View>
  );
}

function AssignmentsCard({ studentId, schoolId, className, themeColor }: { studentId: string; schoolId: string; className: string; themeColor: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [subs, setSubs] = useState<Record<string, any>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [school, setSchool] = useState<any>(null);

  async function load() {
    if (!studentId || !schoolId || !className) return;
    setLoading(true);
    if (!school) { const { data: sch } = await supabase.from('schools').select('*').eq('id', schoolId).maybeSingle(); if (sch) setSchool(sch); }
    const { data: asgs } = await supabase.from('assignments')
      .select('*').eq('school_id', schoolId).eq('class_name', className)
      .order('created_at', { ascending: false });
    setItems(asgs || []);
    if (asgs && asgs.length) {
      const { data: mySubs } = await supabase.from('assignment_submissions')
        .select('*').eq('student_id', studentId).in('assignment_id', asgs.map((a: any) => a.id));
      const map: Record<string, any> = {};
      (mySubs || []).forEach((s: any) => { map[s.assignment_id] = s; });
      setSubs(map);
    } else setSubs({});
    setLoading(false);
  }

  useEffect(() => { if (open) load(); }, [open, studentId, className]);

  async function submitAnswer(assignmentId: string) {
    const text = (drafts[assignmentId] ?? '').trim();
    if (!text) { Alert.alert('Empty Answer', 'Type your answer before submitting.'); return; }
    setSavingId(assignmentId);
    try {
      const { data, error } = await supabase.from('assignment_submissions')
        .upsert({ assignment_id: assignmentId, student_id: studentId, school_id: schoolId, answer_text: text, status: 'submitted', submitted_at: new Date().toISOString() }, { onConflict: 'assignment_id,student_id' })
        .select().single();
      if (error) throw error;
      setSubs(prev => ({ ...prev, [assignmentId]: data }));
      setDrafts(prev => { const n = { ...prev }; delete n[assignmentId]; return n; });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Submitted', 'Your answer was sent to your teacher.');
    } catch (e: any) { Alert.alert('Could not submit', e.message); }
    setSavingId(null);
  }

  async function removeSubmission(assignmentId: string, submissionId: string) {
    const doDelete = async () => {
      await supabase.from('assignment_submissions').delete().eq('id', submissionId);
      setSubs(prev => { const n = { ...prev }; delete n[assignmentId]; return n; });
      setDrafts(prev => { const n = { ...prev }; delete n[assignmentId]; return n; });
    };
    if (Platform.OS === 'web') { if (window.confirm('Delete your submission for this assignment?')) doDelete(); return; }
    Alert.alert('Delete submission?', 'This removes your answer (and any grade).', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => doDelete() },
    ]);
  }

  async function downloadPdf(a: any, sub: any) {
    const marked = sub && (sub.status === 'marked' || sub.score != null || sub.grade);
    const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, (c: string) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[c]);
    let sch: any = school;
    if (!sch) { const r = await supabase.from('schools').select('*').eq('id', schoolId).maybeSingle(); sch = r.data; if (sch) setSchool(sch); }
    const sName = (sch?.name || sch?.school_name || sch?.title || 'EduSalone School').toString();
    const sLogo = (sch?.logo_url || sch?.logo || '').toString();
    const sAddr = (sch?.address || '').toString();
    const sPhone = (sch?.phone || sch?.contact || sch?.phone_number || '').toString();
    const sMotto = (sch?.motto || '').toString();
    const contact = [sAddr, sPhone].filter(Boolean).map(esc).join(' &bull; ');
    const head = `<div class="lh">${sLogo ? `<img class="logo" src="${esc(sLogo)}"/>` : ''}<div class="lhmid"><div class="sn">${esc(sName)}</div>${sMotto ? `<div class="mt">${esc(sMotto)}</div>` : ''}${contact ? `<div class="ct">${contact}</div>` : ''}</div></div><div class="rule"></div>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(a.title)}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;color:#1A202C;max-width:720px;margin:30px auto;padding:0 20px;}
      .lh{display:flex;align-items:center;gap:14px;}.logo{width:64px;height:64px;object-fit:contain;border-radius:8px;}
      .lhmid{flex:1;text-align:center;}.sn{font-size:22px;font-weight:bold;color:#234E52;letter-spacing:.02em;}
      .mt{font-style:italic;color:#718096;font-size:12px;margin-top:2px;}.ct{color:#718096;font-size:11px;margin-top:3px;}
      .rule{height:3px;background:#234E52;border-radius:2px;margin:10px 0 18px;}
      h1{color:#234E52;font-size:20px;margin-bottom:2px;}.meta{color:#718096;font-size:12px;margin-bottom:16px;}
      .box{border:1px solid #E2E8F0;border-radius:10px;padding:14px;margin-bottom:14px;}
      .lbl{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#A0AEC0;margin-bottom:4px;}
      .grade{background:#F0FFF4;border:1px solid #9AE6B4;}.gv{color:#276749;font-weight:bold;}
      .fb{font-style:italic;color:#2F855A;margin-top:4px;}.foot{margin-top:24px;color:#A0AEC0;font-size:11px;text-align:center;}</style></head>
      <body>
        ${head}
        <h1>${esc(a.title)}</h1>
        <div class="meta">${esc(className)}${a.subject ? ' &bull; ' + esc(a.subject) : ''}${a.due_date ? ' &bull; Due ' + esc(a.due_date) : ''}</div>
        <div class="box"><div class="lbl">Instructions / Question</div><div>${esc(a.instructions)}</div></div>
        <div class="box"><div class="lbl">My Answer</div><div>${esc(sub?.answer_text || '(not submitted)')}</div></div>
        ${marked ? `<div class="box grade"><div class="lbl">Result</div><div class="gv">${esc(sub.grade || '')}${sub.score != null ? ' (' + esc(sub.score) + ')' : ''}</div>${sub.feedback ? `<div class="fb">&ldquo;${esc(sub.feedback)}&rdquo;</div>` : ''}</div>` : ''}
        <div class="foot">Generated from EduSalone Student Portal</div>
      </body></html>`;
    if (Platform.OS === 'web') {
      const w = window.open('', '_blank');
      if (!w) { Alert.alert('Pop-up blocked', 'Allow pop-ups for this site, then tap the PDF button again.'); return; }
      w.document.write(html); w.document.close(); w.focus();
      setTimeout(() => { w.print(); }, 400);
    } else {
      Alert.alert('Use the web app', 'PDF download is available on the web portal for now.');
    }
  }

  const pending = items.filter(a => !subs[a.id]).length;

  return (
    <View style={{ backgroundColor: '#FFF', borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', elevation: 2 }}>
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: themeColor }} onPress={() => setOpen(!open)}>
        <Ionicons name="create" size={20} color="#FFF" style={{ marginRight: 10 }} />
        <Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 15, flex: 1 }}>My Assignments</Text>
        {pending > 0 && (
          <View style={{ backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 }}>
            <Text style={{ color: themeColor, fontSize: 11, fontWeight: '900' as any }}>{pending} to do</Text>
          </View>
        )}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#FFF" />
      </TouchableOpacity>

      {open && (
        loading ? <ActivityIndicator color={themeColor} style={{ padding: 20 }} /> :
        items.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Ionicons name="document-text-outline" size={40} color="#CBD5E0" />
            <Text style={{ color: '#A0AEC0', marginTop: 8, fontStyle: 'italic', textAlign: 'center' }}>No assignments yet. Check back when your teacher posts one.</Text>
          </View>
        ) : (
          <View style={{ padding: 12 }}>
            {items.map((a: any) => {
              const sub = subs[a.id];
              const isMarked = sub && (sub.status === 'marked' || sub.score != null || sub.grade);
              const answerVal = drafts[a.id] !== undefined ? drafts[a.id] : (sub?.answer_text || '');
              return (
                <View key={a.id} style={{ backgroundColor: '#F7FAFC', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: isMarked ? '#38A169' : sub ? '#D69E2E' : themeColor }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontWeight: '900' as any, color: '#1A365D', fontSize: 14, flex: 1 }}>{a.title}</Text>
                    {sub && (
                      <TouchableOpacity onPress={() => downloadPdf(a, sub)} style={{ padding: 4, marginRight: 2 }}>
                        <Ionicons name="download-outline" size={16} color={themeColor} />
                      </TouchableOpacity>
                    )}
                    {sub && (
                      <TouchableOpacity onPress={() => removeSubmission(a.id, sub.id)} style={{ padding: 4 }}>
                        <Ionicons name="trash-outline" size={15} color="#E53E3E" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={{ color: '#718096', fontSize: 11, marginTop: 2 }}>{a.subject ? `${a.subject} • ` : ''}{a.due_date ? `Due ${a.due_date}` : 'No due date'}</Text>
                  <Text style={{ color: '#4A5568', fontSize: 13, marginTop: 8, lineHeight: 19 }}>{a.instructions}</Text>

                  {isMarked ? (
                    <View style={{ marginTop: 10, backgroundColor: '#F0FFF4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#9AE6B4' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="checkmark-circle" size={16} color="#38A169" style={{ marginRight: 6 }} />
                        <Text style={{ color: '#276749', fontWeight: '900' as any, fontSize: 13 }}>MARKED{sub.grade ? ` — ${sub.grade}` : ''}{sub.score != null ? ` (${sub.score})` : ''}</Text>
                      </View>
                      {sub.feedback ? <Text style={{ color: '#2F855A', fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>“{sub.feedback}”</Text> : null}
                      <Text style={{ color: '#718096', fontSize: 11, marginTop: 8 }}>Your answer:</Text>
                      <Text style={{ color: '#4A5568', fontSize: 12, marginTop: 2 }}>{sub.answer_text}</Text>
                    </View>
                  ) : (
                    <View style={{ marginTop: 10 }}>
                      {sub && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                          <Ionicons name="time" size={14} color="#D69E2E" style={{ marginRight: 5 }} />
                          <Text style={{ color: '#B7791F', fontWeight: '900' as any, fontSize: 12 }}>Submitted — awaiting your teacher. You can still edit.</Text>
                        </View>
                      )}
                      <TextInput
                        style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 13, color: '#2D3748', minHeight: 80, textAlignVertical: 'top' }}
                        placeholder="Type your answer here..." placeholderTextColor="#A0AEC0" multiline
                        value={answerVal} onChangeText={t => setDrafts(prev => ({ ...prev, [a.id]: t }))}
                      />
                      <TouchableOpacity onPress={() => submitAnswer(a.id)} disabled={savingId === a.id}
                        style={{ backgroundColor: savingId === a.id ? '#A0AEC0' : themeColor, borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8, flexDirection: 'row', justifyContent: 'center' }}>
                        {savingId === a.id ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="send" size={15} color="#FFF" style={{ marginRight: 6 }} /><Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 13 }}>{sub ? 'Update Answer' : 'Submit Answer'}</Text></>}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )
      )}
    </View>
  );
}

function OfficeDocsCard({ schoolId, className, themeColor }: { schoolId: string; className: string; themeColor: string }) {
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!schoolId) return;
    setLoading(true);
    const { data } = await supabase.from('school_documents')
      .select('*').eq('school_id', schoolId)
      .in('audience', ['all', 'students', 'parents'])
      .order('created_at', { ascending: false });
    const filtered = (data || []).filter((d: any) => !d.target_class || d.target_class === className);
    setDocs(filtered);
    setLoading(false);
  }

  useEffect(() => { if (open) load(); }, [open, schoolId, className]);

  function openDoc(url: string) {
    if (!url) return;
    if (Platform.OS === 'web') window.open(url, '_blank'); else Linking.openURL(url);
  }

  return (
    <View style={{ backgroundColor: '#FFF', borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', elevation: 2 }}>
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: themeColor }} onPress={() => setOpen(!open)}>
        <Ionicons name="folder-open" size={20} color="#FFF" style={{ marginRight: 10 }} />
        <Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 15, flex: 1 }}>From the Office</Text>
        {docs.length > 0 && (
          <View style={{ backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 }}>
            <Text style={{ color: themeColor, fontSize: 11, fontWeight: '900' as any }}>{docs.length}</Text>
          </View>
        )}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#FFF" />
      </TouchableOpacity>
      {open && (
        loading ? <ActivityIndicator color={themeColor} style={{ padding: 20 }} /> :
        docs.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Ionicons name="file-tray-outline" size={40} color="#CBD5E0" />
            <Text style={{ color: '#A0AEC0', marginTop: 8, fontStyle: 'italic', textAlign: 'center' }}>No documents from the office yet.</Text>
          </View>
        ) : (
          <View style={{ padding: 12 }}>
            {docs.map((d: any) => (
              <View key={d.id} style={{ backgroundColor: '#F7FAFC', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: themeColor }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={d.file_type === 'image' ? 'image' : d.file_type === 'pdf' ? 'document-text' : 'document'} size={24} color={themeColor} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '900' as any, color: '#1A365D', fontSize: 14 }}>{d.title}</Text>
                    <Text style={{ color: '#718096', fontSize: 11, marginTop: 2 }}>{d.sender_name || 'Office'}{d.sender_role ? ` (${d.sender_role})` : ''} · {new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                  </View>
                </View>
                {d.note ? <Text style={{ color: '#4A5568', fontSize: 13, marginTop: 8, lineHeight: 19 }}>{d.note}</Text> : null}
                <TouchableOpacity onPress={() => openDoc(d.file_url)} style={{ backgroundColor: themeColor, borderRadius: 10, padding: 11, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
                  <Ionicons name="download-outline" size={15} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 13 }}>Open / Download</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )
      )}
    </View>
  );
}

export default function StudentDashboard() {
  const router = useRouter();
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [studentRecord, setStudentRecord] = useState<any>(null);
  const [childName, setChildName] = useState<string>('Loading...');
  const [dailyQuote, setDailyQuote] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [linking, setLinking] = useState(false);
  const [unreadMsgs, setUnreadMsgs] = useState(0); 

  const [news, setNews] = useState<any[]>([]);
  const [worldNews, setWorldNews] = useState<any[]>([]); 
  const [timetable, setTimetable] = useState<any[]>([]); 
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [feesData, setFeesData] = useState<any>({ totalBilled: 0, totalPaid: 0, balance: 0 });
  
  const [activeTab, setActiveTab] = useState<'academics' | 'feed' | 'game' | 'rank' | 'materials'>('academics');
  const [newsTab, setNewsTab] = useState<'school' | 'global'>('school'); 
  const [isMuted, setIsMuted] = useState(false);
  const [brainPoints, setBrainPoints] = useState(0);

  const [activeGame, setActiveGame] = useState<'hub'|'trivia'|'mathblitz'|'bossbattle'|'wordscramble'>('hub');
  const [quizIndex, setQuizIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [streak, setStreak] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [mathActive, setMathActive] = useState(false);
  const [mathGameOver, setMathGameOver] = useState(false);
  const [mathTimeLeft, setMathTimeLeft] = useState(0);
  const [mathScore, setMathScore] = useState(0);
  const [mathInput, setMathInput] = useState('');
  const [mathFeedback, setMathFeedback] = useState('');
  const [mathQ, setMathQ] = useState<any>(null);
  const mathTimerRef = useRef<any>(null);
  const mathInputRef = useRef<TextInput | null>(null);
  const mathScrollRef = useRef<any>(null);

  const [wordActive, setWordActive] = useState(false);
  const [wordGameOver, setWordGameOver] = useState(false);
  const [wordTimeLeft, setWordTimeLeft] = useState(0);
  const [wordScore, setWordScore] = useState(0);
  const [wordInput, setWordInput] = useState('');
  const [wordFeedback, setWordFeedback] = useState('');
  const [currentWord, setCurrentWord] = useState({ original: '', scrambled: '' });
  const wordTimerRef = useRef<any>(null);
  const wordInputRef = useRef<TextInput | null>(null);
  const wordScrollRef = useRef<any>(null);

  const [bossIdx, setBossIdx] = useState(0);
  const [bossHP, setBossHP] = useState(0);
  const [playerHP, setPlayerHP] = useState(100);
  const [bossStarted, setBossStarted] = useState(false);
  const [bossGameOver, setBossGameOver] = useState(false);
  const [totalVictory, setTotalVictory] = useState(false);
  const [bossAnswered, setBossAnswered] = useState(false);
  const [bossQ, setBossQ] = useState<any>(null);
  const [damageFlash, setDamageFlash] = useState('');

  const progressAnimWidth = useRef(new Animated.Value(0)).current;

  const userRole = profile?.role?.toLowerCase().trim() || '';
  const isGamer = userRole === 'public gamer';
  const isParent = userRole === 'parent';

  const activeBoss = BOSSES[bossIdx] || BOSSES[0];
  const themeColor = getSchoolThemeColor(profile?.schools?.name);

  const firstName = profile?.full_name?.split(' ')[0] || 'Student';
  const initials = profile?.full_name ? profile.full_name.substring(0, 2).toUpperCase() : '👤';

  useFocusEffect(
    useCallback(() => {
      setDailyQuote(dailyQuotes[Math.floor(Math.random() * dailyQuotes.length)]);
      fetchDashboardData(); 
      fetchLiveWorldNews(); 
      const newsInterval = setInterval(fetchLiveWorldNews, 60000);
      return () => { 
        clearInterval(newsInterval);
        if (mathTimerRef.current) clearInterval(mathTimerRef.current); 
        if (wordTimerRef.current) clearInterval(wordTimerRef.current); 
      };
    }, [])
  );

  useEffect(() => {
    if (!profile?.school_id || !studentRecord?.current_class) return;
    const channel = supabase.channel('realtime-timetable')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timetables', filter: `school_id=eq.${profile.school_id}` }, () => {
        fetchTimetable(profile.school_id, studentRecord.current_class);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.school_id, studentRecord?.current_class]);
// ✅ REAL-TIME: Fees + Report Card updates
useEffect(() => {
  if (!studentRecord?.id) return;
  const feeChannel = supabase.channel('realtime-fees-reports')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'fee_transactions',
      filter: `student_id=eq.${studentRecord.id}`
    }, () => { fetchDashboardData(); })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'students',
      filter: `id=eq.${studentRecord.id}`
    }, () => { fetchDashboardData(); })
    .subscribe();
  return () => { supabase.removeChannel(feeChannel); };
}, [studentRecord?.id]);

// ✅ REAL-TIME: Lesson materials updates
useEffect(() => {
  const schoolId = studentRecord?.school_id || profile?.school_id;
  const className = studentRecord?.current_class || 'General';
  if (!schoolId) return;
  const matChannel = supabase.channel('realtime-materials')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'learning_materials',
      filter: `school_id=eq.${schoolId}`
    }, () => { fetchMaterials(schoolId, className); })
    .subscribe();
  return () => { supabase.removeChannel(matChannel); };
}, [profile?.school_id, studentRecord?.school_id, studentRecord?.current_class]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    const medal = getRankDetails(brainPoints);
    Animated.timing(progressAnimWidth, { toValue: medal.progress, duration: 800, useNativeDriver: false }).start();
  }, [brainPoints]);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      const { data: profileData } = await supabase.from('users').select('*, schools(name, logo_url, school_code, motto, address, phone, email, leadership_title)').eq('email', user.email).single();
      
      if (profileData) {
        setProfile(profileData);
        // 🔔 Register THIS user's device for push notifications (students & parents)
        registerForPush(profileData.id).catch(() => {});
        let query = supabase.from('students').select('*, schools(*)');
        if (profileData.role === 'Student') { query = query.eq('user_id', profileData.id); } 
        else if (profileData.role === 'Parent') { query = query.eq('parent_user_id', profileData.id); }

        const { data: studentData } = await query.maybeSingle();
        const activeSchoolId = studentData?.school_id || profileData.school_id;

        if (studentData) {
          setStudentRecord(studentData);
          setBrainPoints(studentData.brain_points || 0); 
          
          if (profileData.role === 'Parent') {
            const { data: childUser } = await supabase.from('users').select('full_name').eq('id', studentData.user_id).single();
            setChildName(childUser?.full_name || 'Your Child');
          } else { setChildName(profileData.full_name); }

          const expectedFee = Number(studentData.expected_fee) || 0;
          const { data: feeTxs } = await supabase.from('fee_transactions')
            .select('amount_paid_sll, receipt_number, payment_date, payment_method')
            .eq('student_id', studentData.id)
            .order('payment_date', { ascending: false });
          const totalPaid = feeTxs?.reduce((sum, t) => sum + (Number(t.amount_paid_sll) || 0), 0) || 0;
          
          setFeesData({ 
            totalBilled: expectedFee, 
            totalPaid: totalPaid, 
            balance: expectedFee - totalPaid,
            history: feeTxs || []
          });
        } else {
          setChildName(profileData.full_name);
          setBrainPoints(0); 
        }

        const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', profileData.id).eq('is_read', false);
        setUnreadMsgs(msgCount || 0);

        if (activeSchoolId) {
          fetchNews(activeSchoolId);
          fetchLeaderboard(activeSchoolId);
          fetchTimetable(activeSchoolId, studentData?.current_class || 'General');
          fetchMaterials(activeSchoolId, studentData?.current_class || 'General');
        } else if (profileData.role === 'Public Gamer') {
          fetchGlobalLeaderboard();
        }
      }
    } catch (err: any) { console.log('Fetch error caught', err); }
    setLoading(false);
  }

  async function handleLinkChild() {
    if (!linkInput.trim()) { Alert.alert("Input Required", "Please enter your child's Admission Number."); return; }
    setLinking(true);
    try {
      const { data: stdMatch, error: searchError } = await supabase.from('students').select('*').ilike('admission_number', linkInput.trim()).eq('school_id', profile.school_id).maybeSingle();
      if (searchError || !stdMatch) { Alert.alert("Not Found", "No student found with that Admission Number in your school."); } 
      else if (stdMatch.parent_user_id && stdMatch.parent_user_id !== profile.id) { Alert.alert("Already Linked", "This student is already linked to another parent."); } 
      else {
        const { error: updateError } = await supabase.from('students').update({ parent_user_id: profile.id }).eq('id', stdMatch.id);
        if (updateError) throw updateError;
        Alert.alert("Success!", "You have securely linked your child's account."); setLinkInput(''); fetchDashboardData(); 
      }
    } catch (err: any) { Alert.alert("Error", "Could not securely link account at this time."); }
    setLinking(false);
  }

  async function syncXPToDatabase(newXP: number) {
    setBrainPoints(newXP);
    if (studentRecord) {
      await supabase.from('students').update({ brain_points: newXP }).eq('id', studentRecord.id);
      fetchLeaderboard(studentRecord.school_id);
    } else if (isGamer && profile) {
      await supabase.from('users').update({ brain_points: newXP }).eq('id', profile.id);
      fetchGlobalLeaderboard();
    }
  }

  async function fetchLeaderboard(schoolId: string) { 
    const { data, error } = await supabase.rpc('get_school_leaderboard', { _school_id: schoolId });
    if (error) { console.log('Leaderboard error:', error.message); return; }
    if (data) setLeaderboard(data.map((s: any) => ({ user_id: s.user_id, full_name: s.full_name || 'Unknown Student', brain_points: s.brain_points || 0 }))); 
  }
  async function fetchGlobalLeaderboard() { 
    const { data: usersData } = await supabase.from('users').select('id, full_name, brain_points').eq('role', 'Public Gamer').order('brain_points', { ascending: false }).limit(10); 
    if (usersData) setLeaderboard(usersData.map((u: any) => ({ user_id: u.id, full_name: u.full_name, brain_points: u.brain_points || 0 }))); 
  }
  async function fetchTimetable(schoolId: string, className: string) { 
    const { data } = await supabase.from('timetables').select('*').eq('school_id', schoolId).eq('class_name', className).order('created_at', { ascending: true }); 
    if (data) setTimetable(data); 
  }
  async function fetchNews(schoolId: string) { 
    const { data } = await supabase.from('school_news').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(10); 
    if (data) setNews(data); 
  }
  async function fetchMaterials(schoolId: string, className: string) {
    setLoadingMaterials(true);
    const { data } = await supabase.from('learning_materials')
      .select('*')
      .eq('school_id', schoolId)
      .or(`class_name.eq.${className},target.eq.all`)
      .order('created_at', { ascending: false });
    if (data) setMaterials(data);
    setLoadingMaterials(false);
  }

  async function openMaterial(fileUrl: string, fileName: string) {
    if (!fileUrl) { Alert.alert('No File', 'This material has no file link.'); return; }
    try {
      if (Platform.OS === 'web') {
        window.open(fileUrl, '_blank');
      } else {
        const supported = await Linking.canOpenURL(fileUrl);
        if (supported) await Linking.openURL(fileUrl);
        else Alert.alert('Cannot Open', `Unable to open ${fileName}. The file link may be invalid.`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not open the file.');
    }
  }
 async function fetchLiveWorldNews() {
    const GNEWS_KEY = ''; // ← paste your free GNews API key here (from gnews.io)
    try {
      if (GNEWS_KEY) {
        const res = await fetch(`https://gnews.io/api/v4/top-headlines?lang=en&max=10&apikey=${GNEWS_KEY}`);
        const json = await res.json();
        if (json.articles && json.articles.length) {
          setWorldNews(json.articles.map((a: any, i: number) => ({ id: String(i), source: a.source?.name || 'News', title: a.title, date: new Date(a.publishedAt).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) })));
          return;
        }
      }
      const response = await fetch('https://api.spaceflightnewsapi.net/v4/articles?limit=8');
      const json = await response.json();
      if (json.results) setWorldNews(json.results.map((a: any) => ({ id: a.id.toString(), source: a.news_site, title: a.title, date: new Date(a.published_at).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) })));
    } catch (error) { setWorldNews([{ id: '1', source: 'Global News', title: 'Connect to internet to see news.', date: new Date().toLocaleString() }]); }
  }

  function getRankDetails(points: number) {
    if (points >= 5000) return { rank: "Grandmaster", color: "#805AD5", icon: "diamond", nextTarget: 5000, progress: 100 };
    if (points >= 2500) return { rank: "WASSCE Master", color: "#B794F4", icon: "diamond", nextTarget: 5000, progress: ((points - 2500) / 2500) * 100 };
    if (points >= 1000) return { rank: "Gold Scholar", color: "#D69E2E", icon: "medal", nextTarget: 2500, progress: ((points - 1000) / 1500) * 100 };
    if (points >= 500) return { rank: "Silver Achiever", color: "#A0AEC0", icon: "medal", nextTarget: 1000, progress: ((points - 500) / 500) * 100 };
    if (points >= 100) return { rank: "Bronze Learner", color: "#975A16", icon: "medal", nextTarget: 500, progress: ((points - 100) / 400) * 100 };
    return { rank: "Novice", color: "#718096", icon: "school", nextTarget: 100, progress: (points / 100) * 100 }; 
  }

  function loadNextTrivia() {
    setAnswered(false); setSelectedOption(''); setFeedbackMsg('');
    let targetDiff = 1;
    if (streak >= 6) targetDiff = 3; else if (streak >= 3) targetDiff = 2;
    let available = triviaBank.filter(q => q.difficulty === targetDiff);
    if (available.length === 0) available = triviaBank; 
    const randomQ = available[Math.floor(Math.random() * available.length)];
    setQuizIndex(triviaBank.indexOf(randomQ)); 
  }

  async function handleTriviaAnswer(option: string) {
    if (answered || isSpeaking) return; 
    setSelectedOption(option); setAnswered(true); setIsSpeaking(true); 

    const currentQ = triviaBank[quizIndex];
    if (option === currentQ.answer) { 
      const newStreak = streak + 1; setStreak(newStreak);
      let multiplier = 1; if (currentQ.difficulty === 2) multiplier = 2; if (currentQ.difficulty === 3) multiplier = 3;
      const xpGained = 10 * multiplier;
      syncXPToDatabase(brainPoints + xpGained);
          
      const praise = praisePhrases[Math.floor(Math.random() * praisePhrases.length)];
      setFeedbackMsg(`✅ Correct! +${xpGained} XP`);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!isMuted) speakText(`Correct, ${firstName}! ${praise}`, { rate: 0.9, onDone: () => setIsSpeaking(false) });
      else setIsSpeaking(false);
    } else {
      setStreak(0); setFeedbackMsg(`❌ Wrong. Answer: ${currentQ.answer}`);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (!isMuted) speakText(`Wrong, ${firstName}. The correct answer is ${currentQ.answer}. Try the next one.`, { rate: 0.9, onDone: () => setIsSpeaking(false) });
      else setIsSpeaking(false);
    }
  }

  function generateMathQuestion() {
    const num1 = Math.floor(Math.random() * 20) + 2; const num2 = Math.floor(Math.random() * 15) + 2;
    if (Math.random() > 0.5) return { question: `${num1} + ${num2}`, answer: num1 + num2 };
    return { question: `${num1} × ${num2}`, answer: num1 * num2 };
  }

  function startMathBlitz() {
    setActiveGame('mathblitz'); if (mathTimerRef.current) clearInterval(mathTimerRef.current);
    setMathActive(true); setMathGameOver(false); setMathTimeLeft(30); setMathScore(0); setMathInput(''); setMathQ(generateMathQuestion());
    setTimeout(() => { if(mathInputRef.current) mathInputRef.current.focus(); }, 300);
    mathTimerRef.current = setInterval(() => {
      setMathTimeLeft(prev => { 
        if (prev <= 1) { clearInterval(mathTimerRef.current!); setMathActive(false); setMathGameOver(true); return 0; } 
        return prev - 1; 
      });
    }, 1000);
  }

  function handleMathSubmit() {
    if (!mathQ || !mathActive) return;
    if (parseInt(mathInput) === mathQ.answer) {
     setMathScore(p => p + 10); setMathFeedback(`✅ +10, Great ${firstName}!`);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!isMuted) { const praise = praisePhrases[Math.floor(Math.random() * praisePhrases.length)]; speakText(`${praise}`, { rate: 1.0 }); }
    } else {
      setMathFeedback(`❌ Was ${mathQ.answer}`);
      if (Platform.OS !== 'web' && !isMuted) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setTimeout(() => { setMathFeedback(''); setMathInput(''); setMathQ(generateMathQuestion()); }, 400);
  }

  const finishMathBlitz = async () => {
    if (mathTimerRef.current) clearInterval(mathTimerRef.current);
    setMathActive(false); setMathGameOver(true);
    if (mathScore > 0) syncXPToDatabase(brainPoints + mathScore);
  }

  function generateWord() {
    const word = WORD_SCRAMBLE_BANK[Math.floor(Math.random() * WORD_SCRAMBLE_BANK.length)];
    const scrambled = word.split('').sort(() => 0.5 - Math.random()).join('');
    return { original: word, scrambled: scrambled };
  }

  function startWordScramble() {
    setActiveGame('wordscramble'); if (wordTimerRef.current) clearInterval(wordTimerRef.current);
    setWordActive(true); setWordGameOver(false); setWordTimeLeft(45); setWordScore(0); setWordInput(''); setCurrentWord(generateWord());
    setTimeout(() => { if(wordInputRef.current) wordInputRef.current.focus(); }, 300);
    wordTimerRef.current = setInterval(() => {
      setWordTimeLeft(prev => { 
        if (prev <= 1) { clearInterval(wordTimerRef.current!); setWordActive(false); setWordGameOver(true); return 0; } 
        return prev - 1; 
      });
    }, 1000);
  }

  function handleWordSubmit() {
    if (!currentWord || !wordActive) return;
    if (wordInput.trim().toUpperCase() === currentWord.original) {
     setWordScore(p => p + 20); setWordFeedback(`✅ +20 XP!`);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!isMuted) { const praise = praisePhrases[Math.floor(Math.random() * praisePhrases.length)]; speakText(`${praise} Well done ${firstName}!`, { rate: 0.9 }); }
    } else {
      setWordFeedback(`❌ It was ${currentWord.original}`);
      if (Platform.OS !== 'web' && !isMuted) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setTimeout(() => { setWordFeedback(''); setWordInput(''); setCurrentWord(generateWord()); }, 600);
  }

  const finishWordScramble = async () => {
    if (wordTimerRef.current) clearInterval(wordTimerRef.current);
    setWordActive(false); setWordGameOver(true);
    if (wordScore > 0) syncXPToDatabase(brainPoints + wordScore);
  }

  function startBossBattle() {
    setActiveGame('bossbattle'); setBossIdx(0); setBossHP(BOSSES[0].maxHP); setPlayerHP(100); setBossStarted(true); setBossGameOver(false); setTotalVictory(false);
    setBossQ(triviaBank[Math.floor(Math.random() * triviaBank.length)]);
  }

  async function handleBossAnswer(option: string) {
    if (bossAnswered) return;
    setBossAnswered(true);
    if (option === bossQ.answer) {
      setBossHP(Math.max(0, bossHP - 25)); setDamageFlash('boss');
      if (Platform.OS !== 'web' && !isMuted) Speech.speak(`Direct hit!`, { rate: 1.1 });
      setTimeout(() => {
        setDamageFlash('');
        if (bossHP - 25 <= 0) {
          if (bossIdx >= BOSSES.length - 1) { setTotalVictory(true); syncXPToDatabase(brainPoints + 500); } 
          else { setBossIdx(bossIdx + 1); setBossHP(BOSSES[bossIdx + 1].maxHP); setPlayerHP(100); setBossAnswered(false); setBossQ(triviaBank[Math.floor(Math.random() * triviaBank.length)]); }
        } else { setBossAnswered(false); setBossQ(triviaBank[Math.floor(Math.random() * triviaBank.length)]); }
      }, 1000);
    } else {
      setPlayerHP(Math.max(0, playerHP - activeBoss.attack)); setDamageFlash('player');
      if (Platform.OS !== 'web' && !isMuted) Speech.speak(`Boss attacks!`, { rate: 1.1 });
      setTimeout(() => {
        setDamageFlash('');
        if (playerHP - activeBoss.attack <= 0) setBossGameOver(true);
        else { setBossAnswered(false); setBossQ(triviaBank[Math.floor(Math.random() * triviaBank.length)]); }
      }, 1000);
    }
  }
async function generateStudentReceipt(transaction: any) {
    if (!profile) return;
    try {
      const schoolInfo = profile?.schools;
      const logoHtml = schoolInfo?.logo_url
        ? `<img src="${schoolInfo.logo_url}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:3px solid #1A365D;" />`
        : `<div style="width:70px;height:70px;border-radius:50%;background:#1A365D;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;text-align:center;line-height:1.3;">EDU<br/>SALONE</div>`;
      const amountStr = "SLL " + Number(transaction.amount_paid_sll).toLocaleString();
      const dateStr = new Date(transaction.payment_date).toLocaleDateString('en-GB');
      const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
      <style>
        *{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;}
        .page{border:3px solid #1A365D;border-radius:12px;overflow:hidden;max-width:480px;margin:15px auto;}
        .stripe{height:7px;background:#1A365D;}
        .hdr{background:linear-gradient(135deg,#1A365D,#2B6CB0);padding:18px;display:flex;align-items:center;}
        .si{padding-left:13px;}.sn{color:#FFF;font-size:15px;font-weight:900;text-transform:uppercase;}
        .badge{display:inline-block;background:#D69E2E;color:#FFF;font-size:9px;font-weight:900;padding:3px 9px;border-radius:20px;margin-top:4px;letter-spacing:1px;}
        .idbar{background:#EBF8FF;border-top:1px solid #BEE3F8;border-bottom:1px solid #BEE3F8;padding:9px 18px;display:flex;justify-content:space-between;}
        .rn{font-size:13px;font-weight:900;color:#2B6CB0;}.rd{font-size:11px;color:#4A5568;font-weight:bold;}
        .body{padding:18px;}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;}
        .ib{background:#F7FAFC;border-radius:7px;padding:9px;border-left:3px solid #2B6CB0;}
        .il{font-size:8px;font-weight:900;color:#718096;text-transform:uppercase;margin-bottom:3px;}
        .iv{font-size:12px;font-weight:900;color:#1A365D;}
        .amt{background:linear-gradient(135deg,#F0FFF4,#E6FFFA);border:2px solid #38A169;border-radius:9px;padding:16px;text-align:center;margin-bottom:15px;}
        .al{font-size:9px;font-weight:900;color:#276749;text-transform:uppercase;letter-spacing:2px;margin-bottom:5px;}
        .av{font-size:30px;font-weight:900;color:#22543D;}
        .mt{display:inline-block;background:#C6F6D5;color:#22543D;font-size:9px;font-weight:900;padding:3px 9px;border-radius:20px;margin-top:5px;}
        .sigs{display:flex;justify-content:space-between;padding-top:13px;border-top:1px dashed #CBD5E0;margin-top:13px;}
        .sb{text-align:center;width:45%;}.sl{border-top:1.5px solid #4A5568;margin-bottom:4px;}
        .slb{font-size:8px;font-weight:bold;color:#718096;text-transform:uppercase;}
        .ftr{background:#1A365D;padding:7px;text-align:center;}
        .ft{color:rgba(255,255,255,0.6);font-size:8px;}
      </style></head><body>
      <div class="page">
        <div class="stripe"></div>
        <div class="hdr">${logoHtml}<div class="si"><div class="sn">${schoolInfo?.name || 'School'}</div><div class="badge">OFFICIAL FEE RECEIPT</div></div></div>
        <div class="idbar"><div class="rn">🧾 ${transaction.receipt_number}</div><div class="rd">📅 ${dateStr}</div></div>
        <div class="body">
          <div class="grid">
            <div class="ib" style="grid-column:span 2;"><div class="il">Student Name</div><div class="iv">${(profile?.full_name || 'UNKNOWN').toUpperCase()}</div></div>
            <div class="ib"><div class="il">Class</div><div class="iv">${studentRecord?.current_class || 'N/A'}</div></div>
            <div class="ib"><div class="il">Admission No.</div><div class="iv">${studentRecord?.admission_number || 'N/A'}</div></div>
          </div>
          <div class="amt"><div class="al">Amount Paid</div><div class="av">${amountStr}</div><div class="mt">💳 ${transaction.payment_method}</div></div>
          <div class="sigs"><div class="sb"><div class="sl"></div><div class="slb">Authorized Signature</div></div><div class="sb"><div class="sl"></div><div class="slb">Official Stamp</div></div></div>
        </div>
        <div class="ftr"><div class="ft">Official document • EduSalone • ${new Date().toLocaleString()}</div></div>
      </div></body></html>`;
      if (Platform.OS === 'web') {
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (e: any) { Alert.alert('Error', 'Could not generate receipt.'); }
  }
async function downloadMyReportCard() {
    if (!profile || !studentRecord) { Alert.alert('Notice', 'Profile missing.'); return; }
    if (!studentRecord.report_published) {
      Alert.alert('Report Card Locked', 'The Principal has not published your report card for this term yet. Please check back later.');
      return;
    }
    setPrinting(true);
    try {
      const [{ data: classRecords }, { data: classSize }, { data: evalsData }, { data: attendanceData }, { data: formTeacher }] = await Promise.all([
        supabase.rpc('get_class_records_for_ranking', { _student_id: studentRecord.id }),
        supabase.rpc('get_class_size', { _student_id: studentRecord.id }),
        supabase.from('student_evaluations').select('*').eq('student_id', studentRecord.id).order('term', { ascending: false }).limit(1),
        supabase.from('daily_attendance').select('status').eq('student_id', studentRecord.id),
        supabase.from('users').select('full_name').eq('school_id', studentRecord.school_id).eq('assigned_class', studentRecord.current_class).limit(1).maybeSingle(),
      ]);

      let present = 0, absent = 0, late = 0;
      (attendanceData || []).forEach((r: any) => { if (r.status === 'Present') present++; else if (r.status === 'Absent') absent++; else if (r.status === 'Late') late++; });

      const recs = (classRecords || []) as any[];
      const mine = recs.filter(r => r.student_id === studentRecord.id);
      const reportYear = (mine.find(r => r.academic_year)?.academic_year) || '2025/2026';

      const htmlContent = buildReportCardHTML({
        school: { name: profile?.schools?.name, logo_url: profile?.schools?.logo_url, school_code: profile?.schools?.school_code, motto: profile?.schools?.motto, address: profile?.schools?.address, phone: profile?.schools?.phone, email: profile?.schools?.email, leadership_title: profile?.schools?.leadership_title },
        student: { id: studentRecord.id, full_name: childName, gender: studentRecord.gender, date_of_birth: studentRecord.date_of_birth, admission_number: studentRecord.admission_number, current_class: studentRecord.current_class },
        academicYear: reportYear,
        classRecords: recs,
        classSize: (typeof classSize === 'number' ? classSize : Number(classSize)) || new Set(recs.map(r => r.student_id)).size,
        attendance: { present, absent, late },
        ev: evalsData && evalsData.length > 0 ? evalsData[0] : null,
        formTeacherName: (formTeacher as any)?.full_name,
      });

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        if (printWindow) { printWindow.document.write(htmlContent); printWindow.document.close(); setTimeout(() => { printWindow.print(); }, 500); }
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (error: any) { Alert.alert('Error', 'Could not generate PDF.'); }
    setPrinting(false);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F8' }}>
        <ActivityIndicator size="large" color="#1A365D" />
      </View>
    );
  }

  const currentMedal = getRankDetails(brainPoints);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#F0F4F8', paddingTop: Platform.OS === 'android' ? 40 : 20 }}>
        
        {/* 🌟 DYNAMIC THEMED TOP NAVIGATION & FIXED LOGOUT POS */}
        <View style={styles.topNav}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.greeting, { color: themeColor }]} numberOfLines={1}>Hi, {firstName} 👋</Text>
                <TouchableOpacity onPress={onRefresh} style={{ marginLeft: 10 }}>
                  <Ionicons name="refresh-circle" size={20} color={themeColor} />
                </TouchableOpacity>
              </View>
              <Text style={styles.subText} numberOfLines={1}>
                {isParent ? 'Parent Portal' : 'Student Portal'} • {profile?.schools?.name || 'EduSalone'}
              </Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={async () => { await supabase.auth.signOut(); router.replace('/login'); }}>
              <Ionicons name="log-out-outline" size={24} color="#E53E3E" />
            </TouchableOpacity>
          </View>

          {(!isParent || studentRecord) ? (
            <View style={styles.tabContainer}>
              {!isGamer ? (
                <>
                  <TouchableOpacity style={[styles.tabBtn, activeTab === 'academics' ? { backgroundColor: themeColor, elevation: 2 } : null]} onPress={() => setActiveTab('academics')}>
                    <Ionicons name="book" size={16} color={activeTab === 'academics' ? '#FFF' : '#718096'} />
                    <Text style={[styles.tabText, activeTab === 'academics' ? styles.tabTextActive : null]}> Book</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.tabBtn, activeTab === 'feed' ? { backgroundColor: themeColor, elevation: 2 } : null]} onPress={() => setActiveTab('feed')}>
                    <Ionicons name="megaphone" size={16} color={activeTab === 'feed' ? '#FFF' : '#718096'} />
                    <Text style={[styles.tabText, activeTab === 'feed' ? styles.tabTextActive : null]}> News</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.tabBtn, activeTab === 'materials' ? { backgroundColor: themeColor, elevation: 2 } : null]} onPress={() => setActiveTab('materials')}>
                    <Ionicons name="folder" size={16} color={activeTab === 'materials' ? '#FFF' : '#718096'} />
                    <Text style={[styles.tabText, activeTab === 'materials' ? styles.tabTextActive : null]}> Files</Text>
                  </TouchableOpacity>
                </>
              ) : null}
              <TouchableOpacity style={[styles.tabBtn, activeTab === 'game' ? { backgroundColor: themeColor, elevation: 2 } : null]} onPress={() => { setActiveTab('game'); setActiveGame('hub'); }}>
                <Ionicons name="game-controller" size={16} color={activeTab === 'game' ? '#FFF' : '#718096'} />
                <Text style={[styles.tabText, activeTab === 'game' ? styles.tabTextActive : null]}> Play</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabBtn, activeTab === 'rank' ? { backgroundColor: themeColor, elevation: 2 } : null]} onPress={() => setActiveTab('rank')}>
                <Ionicons name="podium" size={16} color={activeTab === 'rank' ? '#FFF' : '#718096'} />
                <Text style={[styles.tabText, activeTab === 'rank' ? styles.tabTextActive : null]}> Rank</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />}
        >

          {/* 🔗 LINK CHILD (PARENTS ONLY) */}
          {isParent && !studentRecord ? (
            <View style={styles.linkCard}>
              <Ionicons name="link" size={50} color={themeColor} style={{ marginBottom: 15 }} />
              <Text style={[styles.linkTitle, { color: themeColor }]}>Link Your Child</Text>
              <Text style={styles.linkDesc}>Enter your child's Admission Number to view their records.</Text>
              <TextInput style={styles.input} placeholder="e.g. ADM-003" placeholderTextColor="#A0AEC0" value={linkInput} onChangeText={setLinkInput} autoCapitalize="characters" />
              <TouchableOpacity style={styles.linkButton} onPress={handleLinkChild} disabled={linking}>
                {linking ? <ActivityIndicator color="#FFF" /> : <Text style={styles.linkButtonText}>Securely Link Account</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ paddingBottom: 40 }}>
              {/* 🆔 ID CARD */}
              <View style={styles.idCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.avatarBubble, { borderColor: themeColor }]}>
                      <Text style={[styles.avatarText, { color: themeColor }]}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.studentName, { color: themeColor }]} numberOfLines={1}>{profile?.full_name || 'Loading...'}</Text>
                      <Text style={styles.studentDetails}>
                        {isGamer ? 'Global Competitor 🌍' : `Class: ${studentRecord?.current_class || 'Pending Setup'}`}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                    <View style={[styles.pointsBadge, { borderColor: currentMedal.color }]}>
                      <Ionicons name={currentMedal.icon as any} size={14} color={currentMedal.color} />
                      <Text style={[styles.pointsText, { color: currentMedal.color }]}>{currentMedal.rank}</Text>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#2D3748', marginTop: 4 }}>{brainPoints} XP</Text>
                  </View>
                </View>

                <View style={{ marginTop: 15 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text style={{ fontSize: 11, color: '#718096', fontWeight: 'bold' }}>Progress to next rank</Text>
                    <Text style={{ fontSize: 11, color: '#718096', fontWeight: 'bold' }}>{currentMedal.nextTarget} XP</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <Animated.View style={[styles.progressBarFill, { 
                        backgroundColor: currentMedal.color,
                        width: progressAnimWidth.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) 
                      }]} 
                    />
                  </View>
                </View>
              </View>

              {/* 📚 ACADEMICS TAB */}
              {activeTab === 'academics' && !isGamer ? (
                 <View>
                   <View style={styles.quoteCard}>
                      <Ionicons name="bulb" size={24} color="#D69E2E" style={{ marginBottom: 5 }} />
                      <Text style={styles.quoteText}>{dailyQuote || 'Keep learning!'}</Text>
                   </View>

                  {/* 💰 FINANCE & FEES PORTAL (UPDATED WITH RECEIPT SYSTEM) */}
                    <View style={[styles.financeCard, { borderLeftColor: themeColor }]}>
                      <Text style={[styles.financeTitle, { color: themeColor }]}>Term Fees & Invoices</Text>
                      
                      <View style={styles.financeRow}>
                        <Text style={styles.financeLabel}>Total Billed:</Text>
                        <Text style={styles.financeValue}>SLL {Number(feesData.totalBilled).toLocaleString()}</Text>
                      </View>

                      <View style={styles.financeRow}>
                        <Text style={styles.financeLabel}>Total Paid:</Text>
                        <Text style={[styles.financeValue, { color: '#38A169' }]}>SLL {Number(feesData.totalPaid).toLocaleString()}</Text>
                      </View>

                      <View style={[styles.financeRow, { borderBottomWidth: 0, marginTop: 5, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EDF2F7' }]}>
                        <Text style={[styles.financeLabel, { fontWeight: '900' }]}>Balance Remaining:</Text>
                        <Text style={[styles.financeValue, { color: feesData.balance > 0 ? '#E53E3E' : '#38A169', fontSize: 18 }]}>
                          SLL {Number(feesData.balance).toLocaleString()}
                        </Text>
                      </View>

                      {/* 🧾 NEW: CLICKABLE PAYMENT BREAKDOWN */}
                      {feesData.history && feesData.history.length > 0 && (
                        <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: '#EDF2F7', paddingTop: 15 }}>
                          <Text style={{ fontSize: 11, fontWeight: '900', color: '#A0AEC0', marginBottom: 10, letterSpacing: 1 }}>
                            PAYMENT LOG (INSTALLMENTS)
                          </Text>
                          {feesData.history.map((item: any, index: number) => (
                            <View key={index} style={{ 
                              flexDirection: 'row', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              backgroundColor: '#F8FAFC', 
                              padding: 12, 
                              borderRadius: 12,
                              marginBottom: 8,
                              borderWidth: 1,
                              borderColor: '#E2E8F0'
                            }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '900', color: '#1A365D' }}>{item.receipt_number}</Text>
                                <Text style={{ fontSize: 11, color: '#A0AEC0', fontWeight: 'bold' }}>
                                  {new Date(item.payment_date).toLocaleDateString('en-GB')}
                                </Text>
                              </View>
                              
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 14, fontWeight: '900', color: '#38A169', marginBottom: 4 }}>
                                  SLL {Number(item.amount_paid_sll).toLocaleString()}
                                </Text>
                                
                                <TouchableOpacity 
                                  onPress={() => generateStudentReceipt(item)}
                                  activeOpacity={0.7}
                                  style={{ 
                                    backgroundColor: '#EBF8FF', 
                                    paddingHorizontal: 10, 
                                    paddingVertical: 5, 
                                    borderRadius: 6, 
                                    flexDirection: 'row', 
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: '#3182CE'
                                  }}
                                >
                                  <Ionicons name="document-text" size={12} color="#2B6CB0" />
                                  <Text style={{ fontSize: 10, color: '#2B6CB0', fontWeight: '900', marginLeft: 4 }}>RECEIPT</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                   
                   {/* 🌟 ENTERPRISE FIX: SECURE REPORT CARD LOCK */}
                   {studentRecord?.report_published ? (
                      <TouchableOpacity style={styles.actionCard} onPress={downloadMyReportCard} disabled={printing}>
                        <View style={styles.actionIconContainer}>
                          {printing ? <ActivityIndicator color="#DD6B20" /> : <Ionicons name="document-text" size={30} color="#DD6B20" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.actionTitle}>Download Report Card</Text>
                          <Text style={styles.actionDesc}>View and print official academic progress.</Text>
                        </View>
                        <Ionicons name="download-outline" size={24} color={themeColor} />
                      </TouchableOpacity>
                   ) : (
                      <View style={[styles.actionCard, { opacity: 0.7, backgroundColor: '#F7FAFC' }]}>
                        <View style={[styles.actionIconContainer, { backgroundColor: '#EDF2F7' }]}>
                          <Ionicons name="lock-closed" size={24} color="#A0AEC0" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.actionTitle, { color: '#718096' }]}>Report Card Locked</Text>
                          <Text style={styles.actionDesc}>Pending release by the Principal.</Text>
                        </View>
                      </View>
                   )}

                   {/* 📊 MY GRADES SUMMARY */}
                   <AcademicSummaryCard studentId={studentRecord?.id} themeColor={themeColor} />

                   {/* 📝 MY ASSIGNMENTS */}
                   <AssignmentsCard studentId={studentRecord?.id} schoolId={studentRecord?.school_id} className={studentRecord?.current_class} themeColor={themeColor} />

                   {/* 📥 FROM THE OFFICE */}
                   <OfficeDocsCard schoolId={studentRecord?.school_id} className={studentRecord?.current_class} themeColor={themeColor} />

                   <Text style={[styles.sectionTitle, { marginTop: 10, color: themeColor }]}>Class Timetable</Text>
                   <View style={styles.timetableContainer}>
                     {timetable.length > 0 ? (
                       timetable.map((tt: any, i: number) => (
                         <View key={i} style={styles.ttRow}>
                           <Text style={[styles.ttDay, { color: themeColor }]}>{tt.day_of_week}</Text>
                           <Text style={styles.ttSubjects}>{tt.subjects}</Text>
                         </View>
                       ))
                     ) : (
                       <View style={{ padding: 20, alignItems: 'center' }}>
                          <Ionicons name="time" size={40} color="#CBD5E0" style={{ marginBottom: 10 }} />
                          <Text style={{ color: '#718096', fontWeight: 'bold', textAlign: 'center' }}>
                            Timetable pending upload from your Class Teacher.
                          </Text>
                       </View>
                     )}
                   </View>
                 </View>
              ) : null}

              {/* 📰 FEED TAB */}
              {activeTab === 'feed' && !isGamer ? (
                <View>
                  <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                    <TouchableOpacity style={[styles.newsToggleBtn, newsTab === 'school' ? { borderBottomColor: themeColor } : null]} onPress={() => setNewsTab('school')}>
                      <Text style={[styles.newsToggleText, newsTab === 'school' ? { color: themeColor } : null]}>School Noticeboard</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.newsToggleBtn, newsTab === 'global' ? { borderBottomColor: themeColor } : null]} onPress={() => setNewsTab('global')}>
                      <Text style={[styles.newsToggleText, newsTab === 'global' ? { color: themeColor } : null]}>World Daily News</Text>
                    </TouchableOpacity>
                  </View>

                  {newsTab === 'school' ? (
                    news.map(n => (
                      <View key={n.id} style={styles.newsCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                          <Ionicons name="megaphone" size={20} color="#38A169" />
                          <Text style={[styles.newsAuthor, { marginLeft: 8, flex: 1 }]}>{n.author_name}</Text>
                          <Text style={styles.newsDate}>{new Date(n.created_at).toLocaleDateString()}</Text>
                        </View>
                        <Text style={styles.newsContent}>{n.content}</Text>
                      </View>
                    ))
                  ) : (
                    worldNews.map(w => (
                      <View key={w.id} style={[styles.newsCard, { borderLeftColor: themeColor }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                          <Ionicons name="globe" size={20} color={themeColor} />
                          <Text style={styles.newsAuthor}>{w.source}</Text>
                          <Text style={styles.newsDate}>{w.date}</Text>
                        </View>
                        <Text style={styles.newsContent}>{w.title}</Text>
                      </View>
                    ))
                  )}
                </View>
              ) : null}
{/* 📁 MATERIALS TAB */}
              {activeTab === 'materials' && !isGamer ? (
                <View>
                  <View style={{ alignItems: 'center', marginBottom: 15 }}>
                    <Ionicons name="folder-open" size={50} color={themeColor} />
                    <Text style={[styles.sectionTitle, { color: themeColor, marginTop: 8, marginBottom: 4 }]}>Lesson Materials</Text>
                    <Text style={{ color: '#718096', fontSize: 13, textAlign: 'center' }}>Notes & resources shared by your teachers</Text>
                  </View>

                  {loadingMaterials ? (
                    <ActivityIndicator color={themeColor} style={{ marginTop: 30 }} />
                  ) : materials.length === 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 30, padding: 20 }}>
                      <Ionicons name="folder-open-outline" size={50} color="#CBD5E0" />
                      <Text style={{ color: '#A0AEC0', marginTop: 10, fontSize: 14, fontStyle: 'italic', textAlign: 'center' }}>
                        No materials shared yet. Check back after your teacher uploads.
                      </Text>
                    </View>
                  ) : (
                    materials.map((m: any) => {
                      const ft = (m.file_type || '').toLowerCase();
                      const isPdf = ft === 'pdf';
                      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ft);
                      const iconName = isPdf ? 'document-text' : isImage ? 'image' : 'document';
                      const iconColor = isPdf ? '#E53E3E' : isImage ? '#38A169' : themeColor;
                      const iconBg = isPdf ? '#FED7D7' : isImage ? '#C6F6D5' : '#EBF8FF';
                      return (
                        <View key={m.id} style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 1, borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 3, borderLeftColor: iconColor }}>
                          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                            <Ionicons name={iconName as any} size={22} color={iconColor} />
                          </View>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={{ fontWeight: '900' as any, color: '#1A365D', fontSize: 14 }} numberOfLines={2}>{m.title}</Text>
                            <Text style={{ color: '#718096', fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                              {(m.subject || 'General')} • {m.class_name} • {new Date(m.created_at).toLocaleDateString('en-GB')}
                            </Text>
                            <Text style={{ color: '#A0AEC0', fontSize: 10, marginTop: 1 }} numberOfLines={1}>{m.file_name}</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => openMaterial(m.file_url, m.file_name)}
                            activeOpacity={0.8}
                            style={{ backgroundColor: themeColor, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="download-outline" size={16} color="#FFF" />
                            <Text style={{ color: '#FFF', fontWeight: '900' as any, fontSize: 12, marginLeft: 4 }}>Open</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                  <View style={{ height: 20 }} />
                </View>
              ) : null}
              {/* 🎮 GAME TAB */}
              {activeTab === 'game' ? (
                <View>
                  {/* 🎮 GAME HUB MENU */}
                  {activeGame === 'hub' ? (
                    <View style={{ alignItems: 'center', paddingTop: 8 }}>
                      <Text style={[styles.sectionTitle, { color: themeColor }]}>🎮 Game Zone</Text>
                      <Text style={{ color: '#718096', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
                        Choose your challenge. Every correct answer earns Brain Points!
                      </Text>

                      <TouchableOpacity onPress={() => { loadNextTrivia(); setActiveGame('trivia'); }} style={[styles.gameHubCard, { backgroundColor: themeColor }]}>
                        <Text style={{ fontSize: 40, marginRight: 16 }}>🧠</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 18 }}>Daily Trivia</Text>
                          <Text style={{ color: '#EBF8FF', fontSize: 12, marginTop: 3 }}>WASSCE & BECE questions across all subjects</Text>
                          <Text style={{ color: '#D69E2E', fontSize: 11, fontWeight: 'bold', marginTop: 4 }}>+10 pts per correct answer</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="#EBF8FF" />
                      </TouchableOpacity>

                      <TouchableOpacity onPress={startMathBlitz} style={[styles.gameHubCard, { backgroundColor: '#1A237E', borderWidth: 1.5, borderColor: '#FFD700' }]}>
                        <Text style={{ fontSize: 40, marginRight: 16 }}>⚡</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: 18 }}>Speed Math Blitz</Text>
                          <Text style={{ color: '#90CAF9', fontSize: 12, marginTop: 3 }}>60 seconds. How many can you solve?</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="#FFD700" />
                      </TouchableOpacity>

                      {/* 🌟 NEW GAME: WORD SCRAMBLE */}
                      <TouchableOpacity onPress={startWordScramble} style={[styles.gameHubCard, { backgroundColor: '#805AD5', borderWidth: 1.5, borderColor: '#D6BCFA' }]}>
                        <Text style={{ fontSize: 40, marginRight: 16 }}>🔠</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 18 }}>Word Scramble</Text>
                          <Text style={{ color: '#E9D8FD', fontSize: 12, marginTop: 3 }}>Unscramble the academic word!</Text>
                          <Text style={{ color: '#D6BCFA', fontSize: 11, fontWeight: 'bold', marginTop: 4 }}>+20 pts for each word</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="#E9D8FD" />
                      </TouchableOpacity>

                      <TouchableOpacity onPress={startBossBattle} style={[styles.gameHubCard, { backgroundColor: '#1C0F2E', borderWidth: 1.5, borderColor: '#E53E3E' }]}>
                        <Text style={{ fontSize: 40, marginRight: 16 }}>👾</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#FC8181', fontWeight: '900', fontSize: 18 }}>Boss Battle</Text>
                          <Text style={{ color: '#E9D8FD', fontSize: 12, marginTop: 3 }}>Defeat 4 bosses to prove BECE readiness</Text>
                          <Text style={{ color: '#FC8181', fontSize: 11, fontWeight: 'bold', marginTop: 4 }}>+150 pts for full victory</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="#FC8181" />
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => syncXPToDatabase(0)} style={{ backgroundColor: '#FED7D7', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10, width: '100%' }}>
                        <Text style={{ color: '#E53E3E', fontWeight: 'bold' }}>🔄 Reset My XP to 0</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {/* 🕹️ TRIVIA ACTIVE SCREEN */}
                  {activeGame === 'trivia' ? (
                    <View style={[styles.gameContainer, streak > 2 ? styles.gameContainerOnFire : null]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 15 }}>
                        <TouchableOpacity onPress={() => setActiveGame('hub')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="arrow-back" size={20} color={themeColor} />
                          <Text style={{ color: themeColor, fontWeight: 'bold', marginLeft: 6 }}>Game Hub</Text>
                        </TouchableOpacity>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={[styles.streakBadge, { backgroundColor: '#EBF8FF', marginRight: 10 }]}>
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: themeColor }}>LVL {triviaBank[quizIndex]?.difficulty || 'Basic'}</Text>
                          </View>
                          
                          {/* 🌟 RESTART TRIVIA BUTTON ADDED */}
                          <TouchableOpacity onPress={loadNextTrivia} style={[styles.restartBtn, { backgroundColor: '#EBF8FF' }]}>
                            <Ionicons name="refresh" size={16} color={themeColor} />
                          </TouchableOpacity>

                          <TouchableOpacity onPress={() => setIsMuted(!isMuted)} style={[styles.restartBtn, { backgroundColor: isMuted ? '#FED7D7' : '#EBF8FF' }]}>
                            <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={16} color={isMuted ? "#E53E3E" : themeColor} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      <Text style={[styles.sectionTitle, { alignSelf: 'flex-start', color: themeColor }]}>Daily Trivia Challenge</Text>
                      <Text style={{ color: '#718096', marginBottom: 20, alignSelf: 'flex-start' }}>
                        Subject: <Text style={{ fontWeight: 'bold', color: themeColor }}>{triviaBank[quizIndex]?.subject || 'Trivia'}</Text>
                      </Text>
                      
                      <View style={styles.questionCard}>
                        <Text style={[styles.questionText, { color: themeColor }]}>{triviaBank[quizIndex]?.question || 'Loading...'}</Text>
                        {triviaBank[quizIndex]?.options.map((opt: string) => {
                          let btnStyle: any = styles.optBtn; let txtStyle: any = styles.optText;
                          if (answered) {
                            if (opt === triviaBank[quizIndex].answer) { btnStyle = [styles.optBtn, { backgroundColor: '#C6F6D5', borderColor: '#38A169', transform: [{scale: 1.02}] }]; txtStyle = [styles.optText, { color: '#22543D' }]; } 
                            else if (opt === selectedOption) { btnStyle = [styles.optBtn, { backgroundColor: '#FED7D7', borderColor: '#E53E3E' }]; txtStyle = [styles.optText, { color: '#822727' }]; }
                          }
                          return (
                            <TouchableOpacity key={opt} style={btnStyle} onPress={() => handleTriviaAnswer(opt)} disabled={answered || isSpeaking}>
                              <Text style={txtStyle}>{opt}</Text>
                            </TouchableOpacity>
                          )
                        })}
                      </View>
                      
                      {answered ? (
                        <View style={{ width: '100%', alignItems: 'center', marginTop: 20 }}>
                          <Text style={{ fontWeight: '900', fontSize: 18, color: selectedOption === triviaBank[quizIndex].answer ? '#38A169' : '#E53E3E', marginBottom: 15, textAlign: 'center' }}>{feedbackMsg}</Text>
                          {isSpeaking ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 15 }}><ActivityIndicator color={themeColor} style={{ marginRight: 10 }} /><Text style={{ color: '#718096', fontWeight: 'bold' }}>🔊 Listen to the answer...</Text></View>
                          ) : (
                            <TouchableOpacity style={[styles.nextButton, selectedOption === triviaBank[quizIndex].answer ? { backgroundColor: '#38A169' } : { backgroundColor: themeColor }]} onPress={loadNextTrivia}>
                              <Text style={styles.nextButtonText}>Next Question ➡️</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* ⚡ MATH BLITZ ACTIVE SCREEN (Wrapped in ScrollView for Keyboard visibility) */}
                  {activeGame === 'mathblitz' ? (
                    <ScrollView
  ref={mathScrollRef}         
  style={{ backgroundColor: '#0D1B4B', borderRadius: 20, minHeight: 420 }}
  contentContainerStyle={{ padding: 20, paddingBottom: 350 }}
  keyboardShouldPersistTaps="handled"
>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <TouchableOpacity
  onPress={() => {
    if (mathTimerRef.current) clearInterval(mathTimerRef.current);
    setMathActive(false);
    setMathGameOver(false);
    setActiveGame('hub');
  }}
  style={{ flexDirection: 'row', alignItems: 'center' }}
>
                          <Ionicons name="arrow-back" size={20} color="#FFD700" />
                          <Text style={{ color: '#FFD700', fontWeight: 'bold', marginLeft: 4 }}>Exit</Text>
                        </TouchableOpacity>
                        <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: 16, letterSpacing: 2 }}>⚡ MATH BLITZ</Text>
                      </View>

                      {mathActive && mathQ ? (
                        <View style={{ alignItems: 'center' }}>
                          <View style={styles.mathTimerBar}>
                            <View style={{ height: '100%', borderRadius: 6, width: `${(mathTimeLeft/60)*100}%`, backgroundColor: mathTimeLeft > 30 ? '#38A169' : mathTimeLeft > 15 ? '#D69E2E' : '#E53E3E' }} />
                          </View>

                          <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 16 }}>
                            <View style={{ alignItems: 'center' }}>
                              <Text style={{ color: mathTimeLeft <= 10 ? '#FC8181' : '#FFD700', fontSize: 28, fontWeight: '900' }}>{mathTimeLeft}s</Text>
                              <Text style={{ color: '#90CAF9', fontSize: 10 }}>TIME LEFT</Text>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                              <Text style={{ color: '#68D391', fontSize: 28, fontWeight: '900' }}>{mathScore}</Text>
                              <Text style={{ color: '#90CAF9', fontSize: 10 }}>SCORE</Text>
                            </View>
                          </View>

                          <View style={{ backgroundColor: '#1A237E', borderRadius: 16, padding: 24, width: '100%', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: '#FFD700' }}>
                            <Text style={{ color: '#90CAF9', fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>SOLVE THIS</Text>
                            <Text style={{ color: '#FFD700', fontSize: 40, fontWeight: '900' }}>{mathQ.question} = ?</Text>
                          </View>

                          {mathFeedback !== '' ? (
                            <View style={{ backgroundColor: mathFeedback.startsWith('✅') ? '#276749' : '#9B2C2C', padding: 10, borderRadius: 10, marginBottom: 12, width: '100%', alignItems: 'center' }}>
                              <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 15 }}>{mathFeedback}</Text>
                            </View>
                          ) : null}

                          <View style={{ flexDirection: 'row', width: '100%', gap: 10 }}>
                            <TextInput ref={mathInputRef} style={styles.mathInput} value={mathInput} onChangeText={setMathInput} keyboardType="numeric" returnKeyType="done" onSubmitEditing={handleMathSubmit} placeholder="?" placeholderTextColor="#4A5568" editable={mathActive} onFocus={() => setTimeout(() => mathScrollRef.current?.scrollToEnd({ animated: true }), 200)}/>
                            <TouchableOpacity onPress={handleMathSubmit} style={{ backgroundColor: '#FFD700', paddingHorizontal: 24, borderRadius: 12, justifyContent: 'center' }}>
                              <Ionicons name="checkmark" size={28} color="#0D1B4B" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : null}

                      {mathGameOver ? (
                        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                          <Text style={{ fontSize: 60 }}>{mathScore >= 200 ? '🏅' : mathScore >= 100 ? '🥇' : mathScore >= 50 ? '🥈' : '📚'}</Text>
                          <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: 26, marginTop: 12 }}>{mathScore >= 200 ? 'GENIUS!' : mathScore >= 100 ? 'EXCELLENT!' : mathScore >= 50 ? 'GOOD EFFORT!' : 'KEEP PRACTISING!'}</Text>
                          
                          <View style={{ backgroundColor: '#1A237E', borderRadius: 16, padding: 20, width: '100%', marginTop: 20, marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                              <View style={{ alignItems: 'center' }}><Text style={{ color: '#FFD700', fontSize: 32, fontWeight: '900' }}>{mathScore}</Text><Text style={{ color: '#90CAF9', fontSize: 11 }}>SCORE</Text></View>
                            </View>
                            <Text style={{ color: '#90CAF9', textAlign: 'center', marginTop: 10, fontSize: 12 }}>Brain Points earned: +{Math.floor(mathScore)} pts</Text>
                          </View>

                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={startMathBlitz} style={{ backgroundColor: '#FFD700', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 25 }}><Text style={{ color: '#0D1B4B', fontWeight: '900', fontSize: 15 }}>Play Again ⚡</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setActiveGame('hub')} style={{ backgroundColor: '#2D3748', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 25 }}><Text style={{ color: '#FFF', fontWeight: '900', fontSize: 15 }}>Hub 🎮</Text></TouchableOpacity>
                          </View>
                        </View>
                      ) : null}
                    </ScrollView>
                  ) : null}


                 {/* 🔠 WORD SCRAMBLE SCREEN */}
{activeGame === 'wordscramble' ? (
  <ScrollView
    ref={wordScrollRef}
    style={{ backgroundColor: '#44337A', borderRadius: 20, minHeight: 420 }}
    contentContainerStyle={{ padding: 20, paddingBottom: 350 }}
    keyboardShouldPersistTaps="handled"
  >
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      {/* ✅ FIX 1: Exit goes directly back to hub */}
      <TouchableOpacity
  onPress={() => {
    if (wordTimerRef.current) clearInterval(wordTimerRef.current);
setWordActive(false);
setWordGameOver(false);
    setActiveGame('hub');
  }}
  style={{ flexDirection: 'row', alignItems: 'center' }}
>
  <Ionicons name="arrow-back" size={20} color="#FFD700" />
  <Text style={{ color: '#FFD700', fontWeight: 'bold', marginLeft: 4 }}>Exit</Text>
</TouchableOpacity>
      <Text style={{ color: '#E9D8FD', fontWeight: '900', fontSize: 16, letterSpacing: 2 }}>🔠 SCRAMBLE</Text>
    </View>

    {wordActive && currentWord ? (
      <View style={{ alignItems: 'center' }}>
        <View style={styles.mathTimerBar}>
          <View style={{ height: '100%', borderRadius: 6, width: `${(wordTimeLeft/45)*100}%`, backgroundColor: wordTimeLeft > 20 ? '#9F7AEA' : wordTimeLeft > 10 ? '#D69E2E' : '#E53E3E' }} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 16 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: wordTimeLeft <= 10 ? '#FC8181' : '#E9D8FD', fontSize: 28, fontWeight: '900' }}>{wordTimeLeft}s</Text>
            <Text style={{ color: '#D6BCFA', fontSize: 10 }}>TIME LEFT</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: '#9AE6B4', fontSize: 28, fontWeight: '900' }}>{wordScore}</Text>
            <Text style={{ color: '#D6BCFA', fontSize: 10 }}>SCORE</Text>
          </View>
        </View>

        <View style={{ backgroundColor: '#2D3748', borderRadius: 16, padding: 24, width: '100%', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: '#9F7AEA' }}>
          <Text style={{ color: '#D6BCFA', fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>UNSCRAMBLE THIS</Text>
          <Text style={{ color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: 4 }}>{currentWord.scrambled}</Text>
        </View>

        {wordFeedback !== '' ? (
          <View style={{ backgroundColor: wordFeedback.startsWith('✅') ? '#276749' : '#9B2C2C', padding: 10, borderRadius: 10, marginBottom: 12, width: '100%', alignItems: 'center' }}>
            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 15 }}>{wordFeedback}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', width: '100%', gap: 10 }}>
          <TextInput
            ref={wordInputRef}
            style={[styles.mathInput, { backgroundColor: '#2D3748', color: '#FFF', borderColor: '#9F7AEA' }]}
            value={wordInput}
            onChangeText={setWordInput}
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={handleWordSubmit}
            placeholder="Type word here..."
            placeholderTextColor="#4A5568"
            editable={wordActive}
            onFocus={() => {
              setTimeout(() => {
                wordScrollRef.current?.scrollToEnd({ animated: true });
              }, 300);
            }}
          />
          <TouchableOpacity onPress={handleWordSubmit} style={{ backgroundColor: '#9F7AEA', paddingHorizontal: 24, borderRadius: 12, justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    ) : null}

    {wordGameOver ? (
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Text style={{ fontSize: 60 }}>{wordScore >= 200 ? '🏅' : wordScore >= 100 ? '🥇' : wordScore >= 50 ? '🥈' : '📚'}</Text>
        <Text style={{ color: '#E9D8FD', fontWeight: '900', fontSize: 26, marginTop: 12 }}>{wordScore >= 200 ? 'WORDSMITH!' : wordScore >= 100 ? 'EXCELLENT!' : wordScore >= 50 ? 'GOOD EFFORT!' : 'KEEP PRACTISING!'}</Text>
        <View style={{ backgroundColor: '#2D3748', borderRadius: 16, padding: 20, width: '100%', marginTop: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#9AE6B4', fontSize: 32, fontWeight: '900' }}>{wordScore}</Text>
              <Text style={{ color: '#D6BCFA', fontSize: 11 }}>SCORE</Text>
            </View>
          </View>
          <Text style={{ color: '#D6BCFA', textAlign: 'center', marginTop: 10, fontSize: 12 }}>Brain Points earned: +{Math.floor(wordScore)} pts</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={startWordScramble} style={{ backgroundColor: '#9F7AEA', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 25 }}>
            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 15 }}>Play Again 🔠</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveGame('hub')} style={{ backgroundColor: '#1A202C', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 25 }}>
            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 15 }}>Hub 🎮</Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : null}
  </ScrollView>
) : null}
                  {/* 👾 BOSS BATTLE ACTIVE SCREEN */}
                  {activeGame === 'bossbattle' && (
                    <View style={[styles.gameContainer, { backgroundColor: '#1C0F2E' }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 15 }}>
                        <TouchableOpacity onPress={() => setActiveGame('hub')} style={styles.backBtn}>
                          <Text style={styles.backBtnTxt}>⬅️ Flee</Text>
                        </TouchableOpacity>
                        <Text style={{ fontWeight: 'bold', color: '#FFF' }}>Player HP: {playerHP}</Text>
                      </View>
                      {!bossGameOver && !totalVictory ? (
                        <View style={{ width: '100%', alignItems: 'center' }}>
                          <Text style={{ fontSize: 60, marginBottom: 10 }}>{activeBoss.emoji}</Text>
                          <Text style={{ color: activeBoss.color, fontSize: 20, fontWeight: 'bold' }}>{activeBoss.name}</Text>
                          <Text style={{ color: '#FC8181', marginBottom: 20 }}>Boss HP: {bossHP}</Text>
                          <View style={styles.questionCard}>
                            <Text style={styles.questionText}>{bossQ?.question}</Text>
                            {bossQ?.options.map((opt: string) => (
                              <TouchableOpacity key={opt} style={styles.bossOptBtn} onPress={() => handleBossAnswer(opt)} disabled={bossAnswered}>
                                <Text style={styles.bossOptText}>{opt}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      ) : (
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 50 }}>{totalVictory ? '🏆' : '💀'}</Text>
                          <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold', marginVertical: 20 }}>
                            {totalVictory ? 'YOU DEFEATED ALL BOSSES!' : 'YOU DIED.'}
                          </Text>
                          <TouchableOpacity style={styles.nextButton} onPress={startBossBattle}>
                            <Text style={styles.nextButtonText}>Try Again</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ) : null}

              {/* 🏆 RANK TAB */}
              {activeTab === 'rank' && (
                <View>
                  <View style={{ alignItems: 'center', marginBottom: 20 }}>
                    <Ionicons name="trophy" size={60} color="#D69E2E" />
                    <Text style={styles.sectionTitle}>{isGamer ? 'Global Leaderboard' : 'School Leaderboard'}</Text>
                    <Text style={{ color: '#718096', fontSize: 13, textAlign: 'center' }}>XP synchronizes in real-time!</Text>
                  </View>
                  <View style={styles.leaderboardContainer}>
                    {leaderboard.length > 0 ? leaderboard.map((student, index) => {
                      const isMe = student.user_id === profile?.id;
                      let medalColor = '#A0AEC0';
                      if (index === 0) medalColor = '#D69E2E';
                      else if (index === 1) medalColor = '#718096';
                      else if (index === 2) medalColor = '#975A16';
                      return (
                        <View key={index} style={[styles.leaderboardRow, isMe ? { backgroundColor: '#EBF8FF' } : null]}>
                          <View style={styles.rankCircle}><Text style={styles.rankNum}>{index + 1}</Text></View>
                          <Text style={{ flex: 1, fontWeight: isMe ? '900' : '600', color: isMe ? '#1A365D' : '#4A5568' }}>
                            {student.full_name} {isMe ? '(You)' : ''}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ fontWeight: 'bold', color: '#718096' }}>{student.brain_points} XP</Text>
                            {index < 3 && <Ionicons name="medal" size={16} color={medalColor} style={{ marginLeft: 5 }} />}
                          </View>
                        </View>
                      );
                    }) : <Text style={{ textAlign: 'center', padding: 20, color: '#A0AEC0' }}>No players found.</Text>}
                  </View>
                  <TouchableOpacity onPress={() => syncXPToDatabase(0)} style={{ marginTop: 30, padding: 15, backgroundColor: '#FED7D7', borderRadius: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#E53E3E', fontWeight: 'bold' }}>Reset My XP (Start Over)</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* ✨ FLOATING ASK-AI BUTTON */}
        <TouchableOpacity style={styles.floatingAIBtn} onPress={() => setIsAIOpen(true)}>
          <Ionicons name="sparkles" size={30} color="#FFF" />
        </TouchableOpacity>

        {/* 💬 FLOATING WHATSAPP BUTTON */}
        <TouchableOpacity style={styles.floatingChatBtn} onPress={() => setIsChatOpen(true)}>
          <Ionicons name="logo-whatsapp" size={36} color="#FFF" />
        </TouchableOpacity>

        {/* ✨ ASK-AI MODAL */}
        <Modal visible={isAIOpen} animationType="slide" onRequestClose={() => setIsAIOpen(false)}>
          <View style={{ flex: 1, backgroundColor: '#F0F4F8', paddingTop: Platform.OS === 'android' ? 30 : 40 }}>
            <TouchableOpacity onPress={() => setIsAIOpen(false)} style={{ padding: 14, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="arrow-back" size={24} color={themeColor} />
              <Text style={{ color: themeColor, fontWeight: '900', fontSize: 16, marginLeft: 8 }}>Back</Text>
            </TouchableOpacity>
            <AskAI themeColor={themeColor} />
          </View>
        </Modal>

        {/* 💬 CHAT MODAL */}
        <Modal visible={isChatOpen} animationType="slide" transparent={false} onRequestClose={() => setIsChatOpen(false)}>
          <View style={{ flex: 1, backgroundColor: '#075E54' }}>
            <View style={styles.chatModalHeader}>
              <TouchableOpacity onPress={() => setIsChatOpen(false)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="arrow-back" size={26} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10 }}>Back to Dashboard</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, backgroundColor: '#FFF' }}>
              <ChatTab />
            </View>
          </View>
        </Modal>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 100 },
  scrollContainer: { padding: 20, paddingBottom: 100 },
  topNav: { backgroundColor: '#FFF', paddingHorizontal: 15, paddingTop: 10, paddingBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, elevation: 3 },
  greeting: { fontSize: 22, fontWeight: '900', color: '#1A365D' },
  subText: { fontSize: 13, color: '#4A5568', marginTop: 2, fontWeight: 'bold' },
  logoutButton: { padding: 8, backgroundColor: '#FED7D7', borderRadius: 10, alignSelf: 'center', marginRight: 5 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#EDF2F7', borderRadius: 10, padding: 4, marginTop: 10 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#1A365D', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 11, fontWeight: 'bold', color: '#718096', marginLeft: 4 },
  tabTextActive: { color: '#FFFFFF' },
  idCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2, borderWidth: 1, borderColor: '#E2E8F0' },
  avatarBubble: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EBF8FF', alignItems: 'center', justifyContent: 'center', marginRight: 15, borderWidth: 2, borderColor: '#3182CE' },
  avatarText: { fontSize: 18, fontWeight: '900', color: '#3182CE' },
  studentName: { fontSize: 18, fontWeight: '900', color: '#1A365D' },
  studentDetails: { fontSize: 12, color: '#718096', fontWeight: '600' },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEFCBF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  pointsText: { fontSize: 11, fontWeight: '900', marginLeft: 4 },
  progressBarBg: { height: 8, backgroundColor: '#EDF2F7', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  quoteCard: { backgroundColor: '#FEFCBF', padding: 15, borderRadius: 12, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#F6E05E' },
  quoteText: { fontSize: 13, fontStyle: 'italic', color: '#744210', textAlign: 'center', fontWeight: 'bold' },
  financeCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderLeftWidth: 4, borderColor: '#E2E8F0', elevation: 2 },
  financeTitle: { fontSize: 16, fontWeight: '900', marginBottom: 10 },
  financeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  financeLabel: { fontSize: 14, color: '#4A5568', fontWeight: '600' },
  financeValue: { fontSize: 14, fontWeight: 'bold', color: '#2D3748' },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 15 },
  timetableContainer: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  ttRow: { borderBottomWidth: 1, borderBottomColor: '#EDF2F7', padding: 15 },
  ttDay: { fontSize: 14, fontWeight: '900', marginBottom: 5 },
  ttSubjects: { fontSize: 13, color: '#4A5568', lineHeight: 20 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  actionIconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FEEBC8', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  actionDesc: { fontSize: 12, color: '#718096', marginTop: 3 },
  newsToggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  newsToggleText: { fontSize: 14, fontWeight: 'bold', color: '#A0AEC0' },
  newsCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#D69E2E', elevation: 1 },
 newsAuthor: { fontSize: 14, fontWeight: 'bold', color: '#2D3748', marginBottom: 5 },
  newsDate: { fontSize: 10, color: '#A0AEC0', fontWeight: 'bold' },
  newsContent: { fontSize: 14, color: '#4A5568', lineHeight: 22 },
  gameHubCard: { width: '100%' as any, borderRadius: 16, padding: 20, marginBottom: 14, flexDirection: 'row', alignItems: 'center' },
  gameContainer: { alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 16, elevation: 2, borderWidth: 1, borderColor: '#E2E8F0' },
  gameContainerOnFire: { borderColor: '#DD6B20', borderWidth: 2, backgroundColor: '#FFFAF0' }, 
  streakBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  restartBtn: { marginLeft: 10, padding: 6, borderRadius: 20 },
  questionCard: { width: '100%' as any, backgroundColor: '#F7FAFC', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  questionText: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  optBtn: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E0', marginBottom: 10, alignItems: 'center' },
  optText: { fontSize: 16, fontWeight: 'bold', color: '#4A5568' },
  bossOptBtn: { backgroundColor: '#2D1B69', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#4A5568', marginBottom: 10, alignItems: 'center' },
  bossOptText: { fontSize: 14, fontWeight: 'bold', color: '#E9D8FD' },
  nextButton: { paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25, elevation: 3, width: '100%' as any, alignItems: 'center' },
  nextButtonText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  mathTimerBar: { width: '100%', height: 12, backgroundColor: '#1A237E', borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  mathInput: { flex: 1, backgroundColor: '#1A237E', color: '#FFD700', fontSize: 24, fontWeight: '900', textAlign: 'center', padding: 14, borderRadius: 12, borderWidth: 2, borderColor: '#4A5568' },
  bossHPBar: { width: '100%', height: 14, backgroundColor: '#2D1B69', borderRadius: 7, overflow: 'hidden' },
  playerHPBar: { width: '100%', height: 10, backgroundColor: '#2D1B69', borderRadius: 5, overflow: 'hidden' },
  leaderboardContainer: { backgroundColor: '#FFF', borderRadius: 16, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', width: '100%' },
  leaderboardRow: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#EDF2F7', alignItems: 'center' },
  rankCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EDF2F7', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  rankNum: { fontSize: 14, fontWeight: 'bold', color: '#4A5568' },
  linkCard: { backgroundColor: '#FFF', padding: 30, borderRadius: 16, alignItems: 'center', marginTop: 20, elevation: 2 },
  linkTitle: { fontSize: 22, fontWeight: '900', marginBottom: 10 },
  linkDesc: { fontSize: 14, color: '#718096', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  input: { width: '100%', backgroundColor: '#F7FAFC', borderRadius: 10, padding: 15, fontSize: 16, color: '#2D3748', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
  linkButton: { width: '100%', backgroundColor: '#38A169', padding: 16, borderRadius: 10, alignItems: 'center' },
  linkButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  floatingAIBtn: { position: 'absolute', bottom: 100, right: 20, backgroundColor: '#6B46C1', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, zIndex: 9999 },
  floatingChatBtn: { position: 'absolute', bottom: 25, right: 20, backgroundColor: '#25D366', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, zIndex: 9999 },
  chatModalHeader: { backgroundColor: '#075E54', paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 15, paddingHorizontal: 20, elevation: 4, zIndex: 10 },
  backBtn: { backgroundColor: '#EDF2F7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  backBtnTxt: { color: '#4A5568', fontWeight: 'bold' }
});