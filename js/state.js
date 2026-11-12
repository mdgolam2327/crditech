/**
 * CRDITEACH - REACTIVE CENTRAL STATE ENGINE
 * Manages knowledge-economy credits, courses, teaching stats, and transactions
 */

import { auth } from './auth.js';

const STORAGE_KEY = 'crditeach_app_state_v2';

const SAMPLE_COURSES = [
  {
    id: 'course-1',
    title: 'Modern Rust & High-Concurrency Systems',
    category: 'backend-system',
    categoryName: 'Backend & Systems',
    desc: 'Master async runtimes (Tokio), Axum web APIs, memory safety without garbage collection, and building blazingly fast microservices.',
    format: 'Masterclass',
    duration: '6 hrs • 8 Modules',
    instructor: {
      name: 'Dr. Lucas Vance',
      role: 'Principal Systems Architect',
      studentsTaught: 184,
      tier: 'Master Mentor',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
    },
    pricingModel: 'dual', // dual, credit-only, free
    creditPrice: 35,
    cashFee: 35,
    rating: 4.95,
    reviewsCount: 142,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    syllabus: [
      { id: 'l-1', title: '01. Ownership, Borrowing & Lifetimes Deep Dive', duration: '28:40', active: true },
      { id: 'l-2', title: '02. Tokio Async Runtime & Concurrency Primitives', duration: '34:15', active: false },
      { id: 'l-3', title: '03. Building REST & gRPC with Axum Framework', duration: '42:10', active: false },
      { id: 'l-4', title: '04. High-Throughput Zero-Copy Network Pipelines', duration: '39:50', active: false }
    ],
    notes: `// Rust Zero-Copy Tokio Example\nuse tokio::net::TcpListener;\n\n#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std::error::Error>> {\n    let listener = TcpListener::bind("127.0.0.1:8080").await?;\n    println!("⚡ Rust Axum Server running without ad interruptions!");\n    Ok(())\n}`
  },
  {
    id: 'course-2',
    title: 'Production LLMs: RAG, Embeddings & Agents',
    category: 'ai-ml',
    categoryName: 'AI & Machine Learning',
    desc: 'Architect enterprise-grade retrieval augmented generation, vector databases, reranking, and autonomous tool-calling AI agents.',
    format: 'Cohort Workshop',
    duration: '4.5 hrs • 6 Modules',
    instructor: {
      name: 'Amina Al-Mansoor',
      role: 'Staff AI Research Engineer',
      studentsTaught: 219,
      tier: 'Knowledge Titan',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80'
    },
    pricingModel: 'dual',
    creditPrice: 40,
    cashFee: 40,
    rating: 4.98,
    reviewsCount: 204,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=600&auto=format&fit=crop&q=80',
    syllabus: [
      { id: 'l-1', title: '01. Vector Embeddings & Hybrid Search Architecture', duration: '25:10', active: true },
      { id: 'l-2', title: '02. Chunking Strategies & Cross-Encoder Rerankers', duration: '31:40', active: false },
      { id: 'l-3', title: '03. Agentic Loops: Function Calling & Memory', duration: '45:00', active: false }
    ],
    notes: `# Production Vector Search Setup\nimport chromadb\nclient = chromadb.PersistentClient(path="./rag_db")\ncollection = client.get_or_create_collection("crditeach_knowledge")\nprint("🤖 AI Model initialized. Ad-free focused learning.")`
  },
  {
    id: 'course-3',
    title: 'Advanced React Architecture & Design Systems',
    category: 'web-dev',
    categoryName: 'Web & Frontend',
    desc: 'Build scalable React 19 apps, micro-frontends, headless component patterns, and token-driven design systems with fluid CSS.',
    format: 'Masterclass',
    duration: '5 hrs • 7 Modules',
    instructor: {
      name: 'Maya Patel', // Current User's published class!
      role: 'Senior Frontend Architect',
      studentsTaught: 86,
      tier: 'Senior Mentor',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
    },
    pricingModel: 'dual',
    creditPrice: 30,
    cashFee: 30,
    rating: 4.91,
    reviewsCount: 78,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&auto=format&fit=crop&q=80',
    syllabus: [
      { id: 'l-1', title: '01. Compound Components & Inversion of Control', duration: '22:15', active: true },
      { id: 'l-2', title: '02. Server Components & Streaming SSR Mechanics', duration: '35:20', active: false },
      { id: 'l-3', title: '03. Custom CSS Design Token Engine', duration: '29:40', active: false }
    ],
    notes: `// Headless Modal Compound Component\nexport function Modal({ children, isOpen, onClose }) {\n  if (!isOpen) return null;\n  return <div className="modal-overlay" onClick={onClose}>{children}</div>;\n}`
  },
  {
    id: 'course-4',
    title: 'Kubernetes in Production: Zero-Downtime GitOps',
    category: 'devops-cloud',
    categoryName: 'DevOps & Cloud',
    desc: 'Architect enterprise K8s clusters, Helm charts, ArgoCD declarative deployments, ingress routing, and Prometheus monitoring.',
    format: 'Live 1:1',
    duration: '4 hrs • 5 Modules',
    instructor: {
      name: 'Soren Lindqvist',
      role: 'Lead Cloud Infrastructure SRE',
      studentsTaught: 147,
      tier: 'Master Mentor',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80'
    },
    pricingModel: 'credit-only', // CREDIT ONLY EXCHANGE!
    creditPrice: 45,
    cashFee: null,
    rating: 4.97,
    reviewsCount: 112,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=600&auto=format&fit=crop&q=80',
    syllabus: [
      { id: 'l-1', title: '01. Declarative Cluster Config with Kustomize', duration: '33:10', active: true },
      { id: 'l-2', title: '02. Automated Canary Rollouts with Argo Rollouts', duration: '41:00', active: false },
      { id: 'l-3', title: '03. Disaster Recovery & Etcd Backups', duration: '27:30', active: false }
    ],
    notes: `# ArgoCD Application Manifest\napiVersion: argoproj.io/v1alpha1\nkind: Application\nmetadata:\n  name: crditeach-cluster\nspec:\n  destination:\n    server: https://kubernetes.default.svc`
  },
  {
    id: 'course-5',
    title: 'System Design: Distributed Cache & Event Streaming',
    category: 'backend-system',
    categoryName: 'Backend & Systems',
    desc: 'Designing systems for 10M+ DAU: Redis clustering, Kafka event logs, partition strategies, consensus protocols, and idempotency.',
    format: 'Masterclass',
    duration: '7 hrs • 9 Modules',
    instructor: {
      name: 'Devon Thorne',
      role: 'Distinguished Engineer',
      studentsTaught: 310,
      tier: 'Knowledge Titan',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80'
    },
    pricingModel: 'dual',
    creditPrice: 50,
    cashFee: 50,
    rating: 4.99,
    reviewsCount: 295,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
    syllabus: [
      { id: 'l-1', title: '01. Consistent Hashing & Cache Invalidation', duration: '35:20', active: true },
      { id: 'l-2', title: '02. Kafka Log Architecture & Partition Keys', duration: '44:10', active: false },
      { id: 'l-3', title: '03. Distributed Locks via Redlock & Zookeeper', duration: '38:40', active: false }
    ],
    notes: `// Distributed Idempotency Key Check\nasync function processTransaction(key, payload) {\n  const acquired = await redis.set(key, "LOCKED", "NX", "EX", 30);\n  if (!acquired) throw new Error("Duplicate request rejected");\n}`
  },
  {
    id: 'course-6',
    title: 'Figma to Code: High-Conversion UX/UI Mastery',
    category: 'design',
    categoryName: 'UI/UX & Product',
    desc: 'Design intuitive, accessibility-compliant web interfaces, design tokens, micro-interactions, and responsive layout systems.',
    format: 'Cohort Workshop',
    duration: '3.5 hrs • 5 Modules',
    instructor: {
      name: 'Elena Rostova',
      role: 'Staff Product Designer',
      studentsTaught: 165,
      tier: 'Master Mentor',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80'
    },
    pricingModel: 'free', // FREE COMMUNITY GIFT!
    creditPrice: 0,
    cashFee: 0,
    rating: 4.88,
    reviewsCount: 118,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=600&auto=format&fit=crop&q=80',
    syllabus: [
      { id: 'l-1', title: '01. Spatial Systems & 8pt Grid Discipline', duration: '20:15', active: true },
      { id: 'l-2', title: '02. Typography Hierarchies & Visual Anchors', duration: '28:40', active: false },
      { id: 'l-3', title: '03. Glassmorphic Depth & Elevation in CSS', duration: '25:00', active: false }
    ],
    notes: `/* Clean Spatial Rhythm */\n:root {\n  --space-1: 4px;\n  --space-2: 8px;\n  --space-3: 16px;\n  --space-4: 24px;\n  --space-5: 32px;\n}`
  }
];

const INITIAL_SPONSORS = [
  {
    id: 'sp-1',
    brand: 'Supabase',
    category: 'Cloud Backend & Postgres',
    logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
    headline: '$200 Free Cloud Credits for Developers',
    desc: 'Dedicated Postgres database, instant authentication, edge functions, and real-time websockets for your apps.',
    bonusCredits: 5,
    claimed: false,
    partnerUrl: 'https://supabase.com'
  },
  {
    id: 'sp-2',
    brand: 'JetBrains',
    category: 'Developer Tooling & IDEs',
    logo: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=100&auto=format&fit=crop&q=80',
    headline: '3 Months Free All Products Pack',
    desc: 'IntelliJ IDEA, WebStorm, PyCharm, and RustRover. The smartest IDEs for modern developers.',
    bonusCredits: 5,
    claimed: false,
    partnerUrl: 'https://jetbrains.com'
  },
  {
    id: 'sp-3',
    brand: 'AWS Activate',
    category: 'Cloud Infrastructure',
    logo: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=100&auto=format&fit=crop&q=80',
    headline: '$1,000 AWS Cloud Builder Credits',
    desc: 'Build, deploy, and scale microservices, serverless Lambdas, S3 storage, and GPU compute instances.',
    bonusCredits: 10,
    claimed: false,
    partnerUrl: 'https://aws.amazon.com'
  },
  {
    id: 'sp-4',
    brand: 'Neon Serverless Postgres',
    category: 'Database Infrastructure',
    logo: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=100&auto=format&fit=crop&q=80',
    headline: 'Free Database Branching for CI/CD',
    desc: 'Create instant database clones for every pull request. Scale compute to zero automatically.',
    bonusCredits: 5,
    claimed: false,
    partnerUrl: 'https://neon.tech'
  }
];

class AppState {
  constructor() {
    this.listeners = [];
    this.loadState();

    // Automatically sync when authentication state changes
    auth.subscribe(() => {
      this.syncWithBackend();
    });
  }

  loadState() {
    try {
      // Clear legacy storage from v1
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('crditeach_app_state_v1');
      }
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.user = parsed.user || this.getDefaultUser();
        this.courses = Array.isArray(parsed.courses) && parsed.courses.length > 0 
          ? parsed.courses 
          : JSON.parse(JSON.stringify(SAMPLE_COURSES));
        this.enrolledCourseIds = Array.isArray(parsed.enrolledCourseIds) && parsed.enrolledCourseIds.length > 0 
          ? parsed.enrolledCourseIds 
          : ['course-1', 'course-2'];
        this.activeCourseId = parsed.activeCourseId || (this.courses[0] ? this.courses[0].id : 'course-1');
        this.sponsors = parsed.sponsors || INITIAL_SPONSORS;
        this.ledger = Array.isArray(parsed.ledger) && parsed.ledger.length > 0 
          ? parsed.ledger 
          : this.getDemoLedger();
        return;
      }
    } catch (e) {
      console.warn('Could not load saved state, starting fresh', e);
    }

    this.user = this.getDefaultUser();
    this.courses = JSON.parse(JSON.stringify(SAMPLE_COURSES));
    this.enrolledCourseIds = ['course-1', 'course-2'];
    this.activeCourseId = 'course-1';
    this.sponsors = INITIAL_SPONSORS;
    this.ledger = this.getDemoLedger();
    this.saveState();
  }

  getDemoLedger() {
    return [
      { id: 'tx-1', title: 'Taught Student: Sarah Connor (Distributed Systems & Go)', date: 'Today, 11:20 AM', amount: '+50 ₢', type: 'earn' },
      { id: 'tx-2', title: 'Claimed Neon DB Developer Cloud Perk', date: 'Yesterday, 3:45 PM', amount: '+30 ₢', type: 'earn' },
      { id: 'tx-3', title: 'Enrolled in Modern Rust & Concurrency Masterclass', date: 'Nov 9, 2026', amount: '-35 ₢', type: 'spend' },
      { id: 'tx-4', title: 'Learner Fee from Alex Kim', date: 'Nov 8, 2026', amount: '+$35.00', type: 'earn' }
    ];
  }

  getDefaultUser() {
    return {
      name: 'Maya Patel',
      role: 'teacher', // 'teacher' or 'learner'
      credits: 65,
      cash: 35.00,
      tier: 'Senior Mentor',
      tierProgress: 68,
      studentsTaught: 86,
      totalCreditsEarned: 240,
      totalCashEarned: 105.00,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
    };
  }

  async syncWithBackend() {
    if (auth.isAuthenticated()) {
      const userData = await auth.fetchUserData();
      if (userData) {
        this.user = {
          id: auth.user.id,
          name: auth.user.fullName,
          email: auth.user.email,
          phone: auth.user.phone,
          role: userData.role || 'teacher',
          credits: userData.credits ?? 0,
          cash: userData.cash ?? 0.0,
          tier: userData.tier || 'Apprentice Teacher',
          tierProgress: userData.tierProgress ?? 0,
          studentsTaught: userData.studentsTaught ?? 0,
          totalCreditsEarned: userData.totalCreditsEarned ?? 0,
          totalCashEarned: userData.totalCashEarned ?? 0.0,
          avatar: userData.avatar || this.getDefaultUser().avatar
        };
        this.enrolledCourseIds = Array.isArray(userData.enrolledCourseIds) ? userData.enrolledCourseIds : [];
        this.activeCourseId = userData.activeCourseId || (this.courses[0]?.id || null);
        this.ledger = Array.isArray(userData.ledger) ? userData.ledger : [];
        if (Array.isArray(userData.claimedSponsorIds)) {
          this.sponsors.forEach(s => {
            s.claimed = userData.claimedSponsorIds.includes(s.id);
          });
        }
        if (Array.isArray(userData.publishedCourses) && userData.publishedCourses.length > 0) {
          userData.publishedCourses.forEach(pub => {
            if (!this.courses.some(c => c.id === pub.id)) {
              this.courses.unshift(pub);
            }
          });
        }
      } else {
        this.user.id = auth.user.id;
        this.user.name = auth.user.fullName;
        this.user.email = auth.user.email;
        this.user.phone = auth.user.phone;
      }
    } else {
      this.user = this.getDefaultUser();
    }
    this.saveState(false);
    this.notify();
  }

  resetToZero(shouldNotify = true) {
    this.user = this.getDefaultUser();
    this.courses = [];
    this.enrolledCourseIds = [];
    this.activeCourseId = null;
    this.sponsors = INITIAL_SPONSORS.map(s => ({ ...s, claimed: false }));
    this.ledger = [];
    this.saveState();
    if (shouldNotify) {
      this.notify();
    }
  }

  loadSampleCourses() {
    this.courses = JSON.parse(JSON.stringify(SAMPLE_COURSES));
    if (this.courses.length > 0 && !this.activeCourseId) {
      this.activeCourseId = this.courses[0].id;
      this.enrolledCourseIds = [this.courses[0].id];
    }
    this.saveState();
    this.notify();
  }

  getPlatformStats() {
    const totalCourses = this.courses.length;
    let totalStudents = this.user.studentsTaught;
    this.courses.forEach(c => {
      if (c.instructor && typeof c.instructor.studentsTaught === 'number') {
        totalStudents += c.instructor.studentsTaught;
      }
    });
    let totalCreditsCirculated = this.user.totalCreditsEarned;
    this.courses.forEach(c => {
      if (typeof c.creditPrice === 'number') {
        totalCreditsCirculated += c.creditPrice;
      }
    });

    return {
      totalCourses,
      totalStudents,
      totalCreditsCirculated,
      adInterruptions: 0
    };
  }

  saveState(syncRemote = true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        user: this.user,
        courses: this.courses,
        enrolledCourseIds: this.enrolledCourseIds,
        activeCourseId: this.activeCourseId,
        sponsors: this.sponsors,
        ledger: this.ledger
      }));
    } catch (e) {
      console.error('Failed to persist state:', e);
    }

    if (syncRemote && auth.isAuthenticated()) {
      const claimedSponsorIds = this.sponsors.filter(s => s.claimed).map(s => s.id);
      auth.persistUserData({
        role: this.user.role,
        credits: this.user.credits,
        cash: this.user.cash,
        tier: this.user.tier,
        tierProgress: this.user.tierProgress,
        studentsTaught: this.user.studentsTaught,
        totalCreditsEarned: this.user.totalCreditsEarned,
        totalCashEarned: this.user.totalCashEarned,
        avatar: this.user.avatar,
        enrolledCourseIds: this.enrolledCourseIds,
        activeCourseId: this.activeCourseId,
        claimedSponsorIds,
        ledger: this.ledger
      });
    }

    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  // --- ACTIONS ---

  toggleRole() {
    this.user.role = this.user.role === 'teacher' ? 'learner' : 'teacher';
    this.saveState();
    return this.user.role;
  }

  setActiveCourse(courseId) {
    this.activeCourseId = courseId;
    this.saveState();
  }

  enrollWithCredits(courseId) {
    const course = this.courses.find(c => c.id === courseId);
    if (!course) return { success: false, message: 'Course not found' };

    if (this.enrolledCourseIds.includes(courseId)) {
      return { success: true, message: 'Already enrolled!' };
    }

    if (this.user.credits < course.creditPrice) {
      return {
        success: false,
        message: `Insufficient Credits! You need ${course.creditPrice} ₢ (You have ${this.user.credits} ₢). Teach a student in Teacher Studio to earn credits!`
      };
    }

    this.user.credits -= course.creditPrice;
    this.enrolledCourseIds.push(courseId);
    this.activeCourseId = courseId;

    this.ledger.unshift({
      id: 'tx-' + Date.now(),
      type: 'spend',
      title: `Enrolled in "${course.title}"`,
      amount: `-${course.creditPrice} ₢`,
      date: 'Just now'
    });

    this.saveState();
    return { success: true, message: `Successfully enrolled in "${course.title}" using ${course.creditPrice} Credits!` };
  }

  enrollWithCash(courseId) {
    const course = this.courses.find(c => c.id === courseId);
    if (!course) return { success: false, message: 'Course not found' };

    if (this.enrolledCourseIds.includes(courseId)) {
      return { success: true, message: 'Already enrolled!' };
    }

    if (course.cashFee === null) {
      return { success: false, message: 'This course is Credit-Exchange only for teachers!' };
    }

    if (this.user.cash < course.cashFee) {
      return {
        success: false,
        message: `Insufficient USD balance ($${this.user.cash.toFixed(2)} vs $${course.cashFee.toFixed(2)} required). Switch to Teacher Mode and teach peers to learn for free!`
      };
    }

    this.user.cash -= course.cashFee;
    this.enrolledCourseIds.push(courseId);
    this.activeCourseId = courseId;

    this.ledger.unshift({
      id: 'tx-' + Date.now(),
      type: 'spend',
      title: `Paid Learner Fee for "${course.title}"`,
      amount: `-$${course.cashFee.toFixed(2)}`,
      date: 'Just now'
    });

    this.saveState();
    return { success: true, message: `Payment of $${course.cashFee.toFixed(2)} processed! Course unlocked in Ad-Free Classroom.` };
  }

  // SIMULATE TEACHING A STUDENT
  teachStudentSimulation(studentName = 'Alex Rivera', skillSubject = 'Fullstack Microservices') {
    const earnedCredits = 50;
    const earnedCash = 35.00;

    this.user.studentsTaught += 1;
    this.user.credits += earnedCredits;
    this.user.totalCreditsEarned += earnedCredits;
    this.user.cash += earnedCash;
    this.user.totalCashEarned += earnedCash;

    // Recalculate Tier
    const count = this.user.studentsTaught;
    if (count >= 15) {
      this.user.tier = 'Knowledge Titan';
      this.user.tierProgress = 100;
    } else if (count >= 10) {
      this.user.tier = 'Master Mentor';
      this.user.tierProgress = Math.min(100, Math.round((count / 15) * 100));
    } else if (count >= 5) {
      this.user.tier = 'Senior Mentor';
      this.user.tierProgress = Math.min(100, Math.round((count / 10) * 100));
    } else {
      this.user.tier = 'Apprentice Teacher';
      this.user.tierProgress = Math.min(100, Math.round((count / 5) * 100));
    }

    this.ledger.unshift({
      id: 'tx-' + Date.now(),
      type: 'gain',
      title: `Taught student ${studentName}: "${skillSubject}"`,
      amount: `+${earnedCredits} ₢ (+$${earnedCash.toFixed(2)})`,
      date: 'Just now'
    });

    this.saveState();

    return {
      studentName,
      earnedCredits,
      earnedCash,
      newTotalCredits: this.user.credits,
      studentsTaught: this.user.studentsTaught,
      tier: this.user.tier
    };
  }

  publishCourse(newCourse) {
    const course = {
      id: 'course-' + Date.now(),
      title: newCourse.title,
      category: newCourse.category,
      categoryName: this.getCategoryName(newCourse.category),
      desc: newCourse.desc,
      format: newCourse.format || 'Masterclass',
      duration: newCourse.duration || '45 mins',
      instructor: {
        name: this.user.name,
        role: this.user.tier,
        studentsTaught: this.user.studentsTaught,
        tier: this.user.tier,
        avatar: this.user.avatar
      },
      pricingModel: newCourse.pricingModel,
      creditPrice: Number(newCourse.creditPrice) || 0,
      cashFee: newCourse.pricingModel === 'credit-only' ? null : (Number(newCourse.cashFee) || 0),
      rating: 5.0,
      reviewsCount: 1,
      videoUrl: newCourse.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80',
      syllabus: [
        { id: 'l-1', title: '01. Introduction & Foundational Concepts', duration: '15:20', active: true },
        { id: 'l-2', title: '02. Hands-on Core Architecture Implementation', duration: '24:45', active: false }
      ],
      notes: `// Taught on Crditeach by ${this.user.name}\nconsole.log("Welcome students! Zero ad interruptions here.");`
    };

    this.courses.unshift(course);
    // Creator is automatically enrolled
    this.enrolledCourseIds.push(course.id);
    this.saveState();

    if (auth.isAuthenticated()) {
      auth.persistCourse(course);
    }

    return course;
  }

  claimSponsorReward(sponsorId) {
    const sponsor = this.sponsors.find(s => s.id === sponsorId);
    if (!sponsor) return { success: false, message: 'Sponsor not found' };
    if (sponsor.claimed) return { success: false, message: 'Perk already claimed!' };

    sponsor.claimed = true;
    this.user.credits += sponsor.bonusCredits;

    this.ledger.unshift({
      id: 'tx-' + Date.now(),
      type: 'gain',
      title: `Partner Quest: ${sponsor.brand} Showcase`,
      amount: `+${sponsor.bonusCredits} ₢`,
      date: 'Just now'
    });

    this.saveState();
    return {
      success: true,
      message: `🎉 Claimed ${sponsor.bonusCredits} bonus Credits from ${sponsor.brand}! Your balance is now ${this.user.credits} ₢.`
    };
  }

  getCategoryName(cat) {
    const map = {
      'web-dev': 'Web & Frontend',
      'backend-system': 'Backend & Systems',
      'ai-ml': 'AI & Machine Learning',
      'devops-cloud': 'DevOps & Cloud',
      'mobile': 'Mobile Dev',
      'design': 'UI/UX & Product'
    };
    return map[cat] || 'Technology';
  }
}

export const state = new AppState();
