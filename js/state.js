/**
 * CRDITEACH - REACTIVE CENTRAL STATE ENGINE
 * Clean production state (Zero dummy videos — loads strictly real DB courses & live streams)
 */

import {
  auth,
  fetchAllCoursesFromServer,
  publishCourseToServer,
  engageCourseOnServer
} from './auth.js';

const STORAGE_KEY = 'crditeach_app_state_v4';

const SAMPLE_COURSES = [];

const INITIAL_SPONSORS = [];

// Helper: Clean currency formatting in Indian Rupees (INR)
export function formatINR(amount) {
  const num = Math.round(Number(amount) || 0);
  return '₹' + num.toLocaleString('en-IN');
}

class AppState {
  constructor() {
    this.listeners = [];
    this.loadState();

    auth.subscribe(() => {
      this.syncWithBackend();
    });
  }

  loadState() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('crditeach_app_state_v1');
        localStorage.removeItem('crditeach_app_state_v2');
      }
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.user = parsed.user || this.getDefaultUser();
        this.courses = Array.isArray(parsed.courses) ? parsed.courses : [];
        this.enrolledCourseIds = Array.isArray(parsed.enrolledCourseIds) ? parsed.enrolledCourseIds : [];
        this.activeCourseId = parsed.activeCourseId || (this.courses[0] ? this.courses[0].id : null);
        this.sponsors = parsed.sponsors || INITIAL_SPONSORS;
        this.ledger = Array.isArray(parsed.ledger) ? parsed.ledger : [];
        return;
      }
    } catch (e) {
      console.warn('Could not load saved state, starting fresh', e);
    }

    this.user = this.getDefaultUser();
    this.courses = [];
    this.enrolledCourseIds = [];
    this.activeCourseId = null;
    this.sponsors = INITIAL_SPONSORS;
    this.ledger = [];
    this.saveState();
  }

  getDefaultUser() {
    return {
      name: 'Guest Learner',
      role: 'teacher',
      credits: 0,
      cash: 0.00,
      tier: 'Apprentice Teacher',
      tierProgress: 0,
      studentsTaught: 0,
      totalCreditsEarned: 0,
      totalCashEarned: 0.00,
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
        message: `Insufficient Credits! You need ${course.creditPrice} ₢ (You have ${this.user.credits} ₢).`
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

    if (auth.isAuthenticated()) {
      fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...auth.getAuthHeaders()
        },
        credentials: 'include',
        body: JSON.stringify({ type: 'credits' })
      }).then(r => r.json()).then(data => {
        if (data.success && typeof data.credits === 'number') {
          this.user.credits = data.credits;
          this.saveState(false);
        }
      }).catch(() => {});
    }

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
        message: `Insufficient INR balance (${formatINR(this.user.cash)} vs ${formatINR(course.cashFee)} required).`
      };
    }

    this.user.cash -= course.cashFee;
    this.enrolledCourseIds.push(courseId);
    this.activeCourseId = courseId;

    this.ledger.unshift({
      id: 'tx-' + Date.now(),
      type: 'spend',
      title: `Paid Learner Fee for "${course.title}"`,
      amount: `-${formatINR(course.cashFee)}`,
      date: 'Just now'
    });

    this.saveState();

    if (auth.isAuthenticated()) {
      fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...auth.getAuthHeaders()
        },
        credentials: 'include',
        body: JSON.stringify({ type: 'cash' })
      }).then(r => r.json()).then(data => {
        if (data.success && typeof data.cash === 'number') {
          this.user.cash = data.cash;
          this.saveState(false);
        }
      }).catch(() => {});
    }

    return { success: true, message: `Payment of ${formatINR(course.cashFee)} processed! Course unlocked in Ad-Free Classroom.` };
  }

  teachStudentSimulation(studentName = 'Alex Rivera', skillSubject = 'Fullstack Microservices') {
    const earnedCredits = 50;
    const earnedCash = 2975; // Standard INR peer coaching incentive (~₹2,975)

    this.user.studentsTaught += 1;
    this.user.credits += earnedCredits;
    this.user.totalCreditsEarned += earnedCredits;
    this.user.cash += earnedCash;
    this.user.totalCashEarned += earnedCash;

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
      amount: `+${earnedCredits} ₢ (+${formatINR(earnedCash)})`,
      date: 'Just now'
    });

    this.saveState();

    if (auth.isAuthenticated()) {
      fetch('/api/user/teach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...auth.getAuthHeaders()
        },
        credentials: 'include',
        body: JSON.stringify({ studentName, skillSubject })
      }).catch(() => {});
    }

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
      desc: (newCourse.desc || '').trim(),
      format: newCourse.format || 'Masterclass',
      duration: newCourse.duration || '',
      instructor: {
        name: this.user.name,
        avatar: this.user.avatar
      },
      pricingModel: newCourse.pricingModel,
      creditPrice: Number(newCourse.creditPrice) || 0,
      cashFee: newCourse.pricingModel === 'credit-only' ? null : (Number(newCourse.cashFee) || 0),
      rating: 0,
      reviewsCount: 0,
      videoUrl: newCourse.videoUrl || '',
      thumbnail: newCourse.thumbnail || '',
      // Only include syllabus modules if user explicitly provided them; otherwise keep empty []
      syllabus: Array.isArray(newCourse.syllabus) && newCourse.syllabus.length > 0 ? newCourse.syllabus : [],
      // Only include notes if user explicitly provided them; otherwise keep empty ''
      notes: (newCourse.notes || '').trim()
    };

    this.courses.unshift(course);
    this.enrolledCourseIds.push(course.id);
    this.saveState();

    if (auth.isAuthenticated()) {
      auth.persistCourse(course);
    }

    return course;
  }

  // Load ONLY real courses & live streams from SQLite DB (No dummy videos)
  async loadCoursesFromDB(searchQuery = '') {
    const dbCourses = await fetchAllCoursesFromServer(searchQuery);

    dbCourses.sort((a, b) => {
      const scoreA = ((a.views || 0) * 1) + ((a.supportCount || 0) * 5) + ((a.rating || 5) * 10);
      const scoreB = ((b.views || 0) * 1) + ((b.supportCount || 0) * 5) + ((b.rating || 5) * 10);
      return scoreB - scoreA;
    });

    this.courses = dbCourses;
    this.saveState(false);
    this.notify();
  }

  async supportCourse(courseId) {
    const course = this.courses.find(c => c.id === courseId);
    if (!course) return;

    course.supportCount = (course.supportCount || 0) + 1;
    this.notify();
    await engageCourseOnServer(courseId, 'support');
  }

  async recordCourseView(courseId) {
    const course = this.courses.find(c => c.id === courseId);
    if (course) {
      course.views = (course.views || 0) + 1;
    }
    await engageCourseOnServer(courseId, 'view');
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

    if (auth.isAuthenticated()) {
      fetch('/api/user/sponsor-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...auth.getAuthHeaders()
        },
        credentials: 'include',
        body: JSON.stringify({
          sponsorId: sponsor.id,
          bonusCredits: sponsor.bonusCredits,
          brand: sponsor.brand
        })
      }).catch(() => {});
    }

    return {
      success: true,
      message: `🎉 Claimed ${sponsor.bonusCredits} bonus Credits from ${sponsor.brand}! Your balance is now ${this.user.credits} ₢.`
    };
  }

  getCategoryName(cat) {
    const map = {
      'web-dev': 'Web & Frontend',
      'backend-system': 'Backend & System',
      'ai-ml': 'AI & Machine Learning',
      'devops-cloud': 'DevOps & Cloud',
      'mobile': 'Mobile Dev',
      'design': 'UI/UX & Product'
    };
    return map[cat] || 'Technology';
  }
}

export const state = new AppState();
