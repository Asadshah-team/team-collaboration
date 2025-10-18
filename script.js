// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAHS_Um6ebLoxbk0Z8ON5SYnhNq6lucUd4",
  authDomain: "e-learning-lms-ecee7.firebaseapp.com",
  databaseURL: "https://e-learning-lms-ecee7-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "e-learning-lms-ecee7",
  storageBucket: "e-learning-lms-ecee7.firebasestorage.app",
  messagingSenderId: "300236848887",
  appId: "1:300236848887:web:778e308fbe877835449df2"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global variables
let currentUser = null;
let currentCourseId = null;

// Utility function to sanitize input
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

// Toggle password visibility
window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.parentElement.querySelector('.eye-icon');
    if (input.type === 'password') {
        input.type = 'text';
        icon.src = 'images/eye-on.png';
        icon.alt = 'Hide Password';
    } else {
        input.type = 'password';
        icon.src = 'images/eye-off.png';
        icon.alt = 'Show Password';
    }
}

// Show section
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
        setTimeout(() => section.classList.add('active'), 10);
    }
    document.querySelector('.logout').style.display = sectionId === 'loginSection' ? 'none' : 'block';
}

// Show modal
function showModal(title, message, modalId = 'successModal') {
    const modal = document.getElementById(modalId);
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    modal.style.display = 'flex';
}

// Close modal
window.closeModal = function(modalId = 'successModal') {
    document.getElementById(modalId).style.display = 'none';
}

// Initialize admin user in Firestore
async function initializeAdminUser() {
    try {
        const adminRef = doc(db, 'users', 'beingshah005@gmail.com');
        const adminDoc = await getDoc(adminRef);
        
        if (!adminDoc.exists()) {
            await setDoc(adminRef, {
                firstName: 'Admin',
                lastName: 'User',
                email: 'beingshah005@gmail.com',
                role: 'admin',
                createdAt: new Date().toISOString()
            });
            console.log('Admin user initialized in Firestore');
        }
    } catch (error) {
        console.error('Error initializing admin:', error);
    }
}

// Login function - Option 2: Uses Firebase Auth for all users
async function login(event) {
    event.preventDefault();
    const email = sanitizeInput(document.getElementById('email').value.trim());
    const password = document.getElementById('password').value;
    const selectedRole = document.getElementById('userRole').value;
    const loginError = document.getElementById('loginError');
    
    try {
        // Authenticate with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Firebase auth successful');
        
        // Get user data from Firestore
        const userRef = doc(db, 'users', email);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('User data:', userData);
            
            // Check if role matches
            if (userData.role === selectedRole) {
                currentUser = { email, ...userData };
                loginError.style.display = 'none';
                
                // Navigate to appropriate dashboard
                if (userData.role === 'admin') {
                    console.log('Loading admin dashboard');
                    showSection('adminSection');
                    await loadAdminDashboard();
                } else if (userData.role === 'teacher') {
                    console.log('Loading teacher dashboard');
                    showSection('teacherSection');
                    await loadTeacherDashboard();
                } else if (userData.role === 'student') {
                    console.log('Loading student dashboard');
                    showSection('studentSection');
                    await loadStudentDashboard();
                }
            } else {
                loginError.textContent = 'Invalid role selected for this account.';
                loginError.style.display = 'block';
                await signOut(auth);
            }
        } else {
            loginError.textContent = 'User data not found in database. Please contact admin.';
            loginError.style.display = 'block';
            await signOut(auth);
        }
    } catch (error) {
        console.error('Login error:', error);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            loginError.textContent = 'Invalid email or password.';
        } else if (error.code === 'auth/too-many-requests') {
            loginError.textContent = 'Too many failed attempts. Please try again later.';
        } else {
            loginError.textContent = 'Login failed: ' + error.message;
        }
        loginError.style.display = 'block';
    }
}

// Logout function
window.logout = async function() {
    try {
        await signOut(auth);
        currentUser = null;
        currentCourseId = null;
        showSection('loginSection');
        document.getElementById('loginForm').reset();
        console.log('Logged out successfully');
    } catch (error) {
        console.error('Logout error:', error);
        alert('Error logging out: ' + error.message);
    }
}

// Create user function
async function createUser(event) {
    event.preventDefault();
    const firstName = sanitizeInput(document.getElementById('userFirstName').value.trim());
    const lastName = sanitizeInput(document.getElementById('userLastName').value.trim());
    const email = sanitizeInput(document.getElementById('userEmail').value.trim());
    const password = document.getElementById('userPassword').value;
    const role = document.getElementById('createUserRole').value;
    const passwordError = document.getElementById('passwordError');
    
    if (password.length < 6) {
        passwordError.textContent = 'Password must be at least 6 characters.';
        passwordError.style.display = 'block';
        return;
    }
    
    try {
        // Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('User created in Firebase Auth');
        
        // Store user data in Firestore
        await setDoc(doc(db, 'users', email), {
            firstName,
            lastName,
            email,
            role,
            createdAt: new Date().toISOString()
        });
        console.log('User data stored in Firestore');
        
        // Sign out the newly created user so admin stays logged in
        await signOut(auth);
        
        // Re-authenticate admin
        await signInWithEmailAndPassword(auth, currentUser.email, 'admin12');
        
        document.getElementById('createUserForm').reset();
        passwordError.style.display = 'none';
        await loadAdminDashboard();
        showModal('User Created', `User created successfully: ${firstName} ${lastName} (${email})`);
    } catch (error) {
        console.error('Create user error:', error);
        passwordError.style.display = 'none';
        if (error.code === 'auth/email-already-in-use') {
            alert('Email already exists');
        } else {
            alert('Error creating user: ' + error.message);
        }
    }
}

// Load admin dashboard
async function loadAdminDashboard() {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        const enrollmentsSnapshot = await getDocs(collection(db, 'enrollments'));
        
        const users = [];
        usersSnapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
        
        const courses = [];
        coursesSnapshot.forEach(doc => courses.push({ id: doc.id, ...doc.data() }));
        
        const enrollments = [];
        enrollmentsSnapshot.forEach(doc => enrollments.push({ id: doc.id, ...doc.data() }));
        
        // Populate teacher dropdown
        const teacherSelect = document.getElementById('courseTeacher');
        teacherSelect.innerHTML = '<option value="" disabled selected>Select Teacher</option>';
        users.filter(u => u.role === 'teacher').forEach(t => {
            const option = document.createElement('option');
            option.value = t.email;
            option.textContent = `${t.firstName} ${t.lastName} (${t.email})`;
            teacherSelect.appendChild(option);
        });
        
        // Populate student dropdown
        const studentSelect = document.getElementById('enrollStudent');
        studentSelect.innerHTML = '<option value="" disabled selected>Select Student</option>';
        users.filter(u => u.role === 'student').forEach(s => {
            const option = document.createElement('option');
            option.value = s.email;
            option.textContent = `${s.firstName} ${s.lastName} (${s.email})`;
            studentSelect.appendChild(option);
        });
        
        // Populate course dropdown
        const courseSelect = document.getElementById('enrollCourse');
        courseSelect.innerHTML = '<option value="" disabled selected>Select Course</option>';
        courses.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.name;
            courseSelect.appendChild(option);
        });
        
        // Display users list
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';
        users.forEach(u => {
            const li = document.createElement('li');
            li.textContent = `${u.firstName} ${u.lastName} (${u.email}) - ${u.role}`;
            if (u.role !== 'admin') {
                const editButton = document.createElement('button');
                editButton.className = 'edit-button';
                editButton.textContent = 'Edit';
                editButton.onclick = () => openEditUserModal(u.email);
                li.appendChild(editButton);
                
                const deleteButton = document.createElement('button');
                deleteButton.className = 'delete-button';
                deleteButton.textContent = 'Delete';
                deleteButton.onclick = () => deleteUser(u.email);
                li.appendChild(deleteButton);
            }
            usersList.appendChild(li);
        });
        
        // Display courses list
        const coursesList = document.getElementById('coursesList');
        coursesList.innerHTML = '';
        courses.forEach(c => {
            const teacher = users.find(u => u.email === c.teacherEmail);
            const li = document.createElement('li');
            li.textContent = `${c.name} - Teacher: ${teacher ? `${teacher.firstName} ${teacher.lastName}` : 'None'}`;
            
            const editButton = document.createElement('button');
            editButton.className = 'edit-button';
            editButton.textContent = 'Edit';
            editButton.onclick = () => openEditCourseModal(c.id);
            li.appendChild(editButton);
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-button';
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => deleteCourse(c.id);
            li.appendChild(deleteButton);
            
            coursesList.appendChild(li);
        });
        
        // Display enrollments list
        const enrollmentsList = document.getElementById('enrollmentsList');
        enrollmentsList.innerHTML = '';
        enrollments.forEach(e => {
            const student = users.find(u => u.email === e.studentEmail);
            const course = courses.find(c => c.id === e.courseId);
            if (student && course) {
                const li = document.createElement('li');
                li.textContent = `${student.firstName} ${student.lastName} enrolled in ${course.name}`;
                enrollmentsList.appendChild(li);
            }
        });
        
        console.log('Admin dashboard loaded successfully');
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        alert('Error loading dashboard: ' + error.message);
    }
}

// Delete user
async function deleteUser(userEmail) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        // Delete from Firestore
        await deleteDoc(doc(db, 'users', userEmail));
        
        // Clean up enrollments if student
        const enrollmentsSnapshot = await getDocs(
            query(collection(db, 'enrollments'), where('studentEmail', '==', userEmail))
        );
        for (const enrollDoc of enrollmentsSnapshot.docs) {
            await deleteDoc(doc(db, 'enrollments', enrollDoc.id));
        }
        
        // Update courses if teacher
        const coursesSnapshot = await getDocs(
            query(collection(db, 'courses'), where('teacherEmail', '==', userEmail))
        );
        for (const courseDoc of coursesSnapshot.docs) {
            await updateDoc(doc(db, 'courses', courseDoc.id), {
                teacherEmail: null
            });
        }
        
        await loadAdminDashboard();
        showModal('User Deleted', 'User deleted successfully.');
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user: ' + error.message);
    }
}

// Open edit user modal
async function openEditUserModal(userEmail) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userEmail));
        if (!userDoc.exists()) return;
        
        const userData = userDoc.data();
        document.getElementById('editUserId').value = userEmail;
        document.getElementById('editUserFirstName').value = userData.firstName;
        document.getElementById('editUserLastName').value = userData.lastName;
        document.getElementById('editUserEmail').value = userData.email;
        document.getElementById('editUserModal').style.display = 'flex';
    } catch (error) {
        console.error('Error opening edit user modal:', error);
    }
}

// Edit user
async function editUser(event) {
    event.preventDefault();
    const userEmail = document.getElementById('editUserId').value;
    const firstName = sanitizeInput(document.getElementById('editUserFirstName').value.trim());
    const lastName = sanitizeInput(document.getElementById('editUserLastName').value.trim());
    
    try {
        await updateDoc(doc(db, 'users', userEmail), {
            firstName,
            lastName,
            updatedAt: new Date().toISOString()
        });
        
        closeModal('editUserModal');
        await loadAdminDashboard();
        showModal('User Updated', `User updated successfully: ${firstName} ${lastName}`);
    } catch (error) {
        console.error('Error updating user:', error);
        alert('Error updating user: ' + error.message);
    }
}

// Create course
async function createCourse(event) {
    event.preventDefault();
    const name = sanitizeInput(document.getElementById('courseName').value.trim());
    const teacherEmail = document.getElementById('courseTeacher').value;
    
    try {
        const courseRef = doc(collection(db, 'courses'));
        await setDoc(courseRef, {
            name,
            teacherEmail,
            outline: [],
            videos: [],
            quizzes: [],
            assignments: [],
            studentMarks: {},
            createdAt: new Date().toISOString()
        });
        
        document.getElementById('createCourseForm').reset();
        await loadAdminDashboard();
        showModal('Course Created', `Course "${name}" created successfully.`);
    } catch (error) {
        console.error('Error creating course:', error);
        alert('Error creating course: ' + error.message);
    }
}

// Open edit course modal
async function openEditCourseModal(courseId) {
    try {
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (!courseDoc.exists()) return;
        
        const courseData = courseDoc.data();
        document.getElementById('editCourseId').value = courseId;
        document.getElementById('editCourseName').value = courseData.name;
        
        // Populate teacher dropdown
        const teacherSelect = document.getElementById('editCourseTeacher');
        teacherSelect.innerHTML = '<option value="" disabled>Select Teacher</option>';
        const usersSnapshot = await getDocs(collection(db, 'users'));
        usersSnapshot.forEach(userDoc => {
            const userData = userDoc.data();
            if (userData.role === 'teacher') {
                const option = document.createElement('option');
                option.value = userData.email;
                option.textContent = `${userData.firstName} ${userData.lastName} (${userData.email})`;
                if (userData.email === courseData.teacherEmail) option.selected = true;
                teacherSelect.appendChild(option);
            }
        });
        
        document.getElementById('editCourseModal').style.display = 'flex';
    } catch (error) {
        console.error('Error opening edit course modal:', error);
    }
}

// Edit course
async function editCourse(event) {
    event.preventDefault();
    const courseId = document.getElementById('editCourseId').value;
    const name = sanitizeInput(document.getElementById('editCourseName').value.trim());
    const teacherEmail = document.getElementById('editCourseTeacher').value;
    
    try {
        await updateDoc(doc(db, 'courses', courseId), {
            name,
            teacherEmail,
            updatedAt: new Date().toISOString()
        });
        
        closeModal('editCourseModal');
        await loadAdminDashboard();
        showModal('Course Updated', `Course "${name}" updated successfully.`);
    } catch (error) {
        console.error('Error updating course:', error);
        alert('Error updating course: ' + error.message);
    }
}

// Delete course
async function deleteCourse(courseId) {
    if (!confirm('Are you sure you want to delete this course?')) return;
    
    try {
        await deleteDoc(doc(db, 'courses', courseId));
        
        // Delete related enrollments
        const enrollmentsSnapshot = await getDocs(
            query(collection(db, 'enrollments'), where('courseId', '==', courseId))
        );
        for (const enrollDoc of enrollmentsSnapshot.docs) {
            await deleteDoc(doc(db, 'enrollments', enrollDoc.id));
        }
        
        await loadAdminDashboard();
        showModal('Course Deleted', 'Course deleted successfully.');
    } catch (error) {
        console.error('Error deleting course:', error);
        alert('Error deleting course: ' + error.message);
    }
}

// Enroll student
async function enrollStudent(event) {
    event.preventDefault();
    const studentEmail = document.getElementById('enrollStudent').value;
    const courseId = document.getElementById('enrollCourse').value;
    
    try {
        // Check if already enrolled
        const enrollmentsSnapshot = await getDocs(
            query(
                collection(db, 'enrollments'),
                where('studentEmail', '==', studentEmail),
                where('courseId', '==', courseId)
            )
        );
        
        if (!enrollmentsSnapshot.empty) {
            alert('Student already enrolled in this course');
            return;
        }
        
        const enrollRef = doc(collection(db, 'enrollments'));
        await setDoc(enrollRef, {
            studentEmail,
            courseId,
            enrolledAt: new Date().toISOString()
        });
        
        document.getElementById('enrollForm').reset();
        await loadAdminDashboard();
        showModal('Enrollment Success', 'Student enrolled successfully.');
    } catch (error) {
        console.error('Error enrolling student:', error);
        alert('Error enrolling student: ' + error.message);
    }
}

// Load teacher dashboard
async function loadTeacherDashboard() {
    try {
        const coursesSnapshot = await getDocs(
            query(collection(db, 'courses'), where('teacherEmail', '==', currentUser.email))
        );
        
        const teacherCourses = document.getElementById('teacherCourses');
        teacherCourses.innerHTML = '';
        
        if (coursesSnapshot.empty) {
            teacherCourses.innerHTML = '<li>No courses assigned yet.</li>';
        } else {
            coursesSnapshot.forEach(courseDoc => {
                const courseData = courseDoc.data();
                const li = document.createElement('li');
                const button = document.createElement('button');
                button.textContent = courseData.name;
                button.onclick = () => manageCourse(courseDoc.id);
                li.appendChild(button);
                teacherCourses.appendChild(li);
            });
        }
        
        console.log('Teacher dashboard loaded successfully');
    } catch (error) {
        console.error('Error loading teacher dashboard:', error);
        alert('Error loading dashboard: ' + error.message);
    }
}

// Manage course (teacher)
async function manageCourse(courseId) {
    currentCourseId = courseId;
    
    try {
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (!courseDoc.exists()) return;
        
        const course = courseDoc.data();
        document.getElementById('currentCourseName').textContent = course.name;
        document.getElementById('courseManagement').style.display = 'block';
        
        // Display outline
        const outlineList = document.getElementById('outlineList');
        outlineList.innerHTML = '';
        (course.outline || []).forEach((topic, index) => {
            const li = document.createElement('li');
            li.textContent = topic.text;
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = topic.completed || false;
            checkbox.onchange = async () => {
                const updatedOutline = [...course.outline];
                updatedOutline[index].completed = checkbox.checked;
                await updateDoc(doc(db, 'courses', courseId), { outline: updatedOutline });
            };
            li.appendChild(checkbox);
            outlineList.appendChild(li);
        });
        
        // Display videos
        const videoList = document.getElementById('videoList');
        videoList.innerHTML = '';
        (course.videos || []).forEach(v => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = v;
            a.textContent = v;
            a.target = '_blank';
            li.appendChild(a);
            videoList.appendChild(li);
        });
        
        // Display quizzes
        const quizList = document.getElementById('quizList');
        quizList.innerHTML = '';
        (course.quizzes || []).forEach(q => {
            const li = document.createElement('li');
            li.textContent = q.name;
            quizList.appendChild(li);
        });
        
        // Display assignments
        const assignmentList = document.getElementById('assignmentList');
        assignmentList.innerHTML = '';
        (course.assignments || []).forEach(a => {
            const li = document.createElement('li');
            li.textContent = a.name;
            assignmentList.appendChild(li);
        });
        
        // Display student marks
        const studentsMarks = document.getElementById('studentsMarks');
        studentsMarks.innerHTML = '';
        
        const enrollmentsSnapshot = await getDocs(
            query(collection(db, 'enrollments'), where('courseId', '==', courseId))
        );
        
        for (const enrollDoc of enrollmentsSnapshot.docs) {
            const enrollment = enrollDoc.data();
            const studentDoc = await getDoc(doc(db, 'users', enrollment.studentEmail));
            
            if (studentDoc.exists()) {
                const student = studentDoc.data();
                const div = document.createElement('div');
                div.innerHTML = `<h5>${student.firstName} ${student.lastName} (${student.email})</h5>`;
                
                // Quiz marks
                (course.quizzes || []).forEach(q => {
                    const input = document.createElement('input');
                    input.type = 'number';
                    input.placeholder = `Mark for ${q.name}`;
                    input.value = course.studentMarks?.[enrollment.studentEmail]?.[`quiz${q.id}`] || '';
                    input.onchange = async () => {
                        const marks = course.studentMarks || {};
                        if (!marks[enrollment.studentEmail]) marks[enrollment.studentEmail] = {};
                        marks[enrollment.studentEmail][`quiz${q.id}`] = parseInt(input.value) || 0;
                        await updateDoc(doc(db, 'courses', courseId), { studentMarks: marks });
                    };
                    div.appendChild(input);
                    div.appendChild(document.createElement('br'));
                });
                
                // Assignment marks
                (course.assignments || []).forEach(a => {
                    const input = document.createElement('input');
                    input.type = 'number';
                    input.placeholder = `Mark for ${a.name}`;
                    input.value = course.studentMarks?.[enrollment.studentEmail]?.[`assignment${a.id}`] || '';
                    input.onchange = async () => {
                        const marks = course.studentMarks || {};
                        if (!marks[enrollment.studentEmail]) marks[enrollment.studentEmail] = {};
                        marks[enrollment.studentEmail][`assignment${a.id}`] = parseInt(input.value) || 0;
                        await updateDoc(doc(db, 'courses', courseId), { studentMarks: marks });
                    };
                    div.appendChild(input);
                    div.appendChild(document.createElement('br'));
                });
                
                studentsMarks.appendChild(div);
            }
        }
    } catch (error) {
        console.error('Error managing course:', error);
        alert('Error loading course: ' + error.message);
    }
}

// Add outline topic
async function addOutlineTopic(event) {
    event.preventDefault();
    const topic = sanitizeInput(document.getElementById('outlineTopic').value.trim());
    
    try {
        const courseDoc = await getDoc(doc(db, 'courses', currentCourseId));
        const course = courseDoc.data();
        const outline = course.outline || [];
        const newId = outline.length ? Math.max(...outline.map(o => o.id)) + 1 : 1;
        outline.push({ id: newId, text: topic, completed: false });
        
        await updateDoc(doc(db, 'courses', currentCourseId), { outline });
        document.getElementById('addOutlineForm').reset();
        await manageCourse(currentCourseId);
    } catch (error) {
        console.error('Error adding outline topic:', error);
        alert('Error adding topic: ' + error.message);
    }
}

// Add video link
async function addVideoLink(event) {
    event.preventDefault();
    const link = sanitizeInput(document.getElementById('videoLink').value.trim());
    
    try {
        const courseDoc = await getDoc(doc(db, 'courses', currentCourseId));
        const course = courseDoc.data();
        const videos = course.videos || [];
        videos.push(link);
        
        await updateDoc(doc(db, 'courses', currentCourseId), { videos });
        document.getElementById('addVideoForm').reset();
        await manageCourse(currentCourseId);
    } catch (error) {
        console.error('Error adding video:', error);
        alert('Error adding video: ' + error.message);
    }
}

// Add quiz
async function addQuiz(event) {
    event.preventDefault();
    const name = sanitizeInput(document.getElementById('quizName').value.trim());
    
    try {
        const courseDoc = await getDoc(doc(db, 'courses', currentCourseId));
        const course = courseDoc.data();
        const quizzes = course.quizzes || [];
        const newId = quizzes.length ? Math.max(...quizzes.map(q => q.id)) + 1 : 1;
        quizzes.push({ id: newId, name });
        
        await updateDoc(doc(db, 'courses', currentCourseId), { quizzes });
        document.getElementById('addQuizForm').reset();
        await manageCourse(currentCourseId);
    } catch (error) {
        console.error('Error adding quiz:', error);
        alert('Error adding quiz: ' + error.message);
    }
}

// Add assignment
async function addAssignment(event) {
    event.preventDefault();
    const name = sanitizeInput(document.getElementById('assignmentName').value.trim());
    
    try {
        const courseDoc = await getDoc(doc(db, 'courses', currentCourseId));
        const course = courseDoc.data();
        const assignments = course.assignments || [];
        const newId = assignments.length ? Math.max(...assignments.map(a => a.id)) + 1 : 1;
        assignments.push({ id: newId, name });
        
        await updateDoc(doc(db, 'courses', currentCourseId), { assignments });
        document.getElementById('addAssignmentForm').reset();
        await manageCourse(currentCourseId);
    } catch (error) {
        console.error('Error adding assignment:', error);
        alert('Error adding assignment: ' + error.message);
    }
}

// Load student dashboard
async function loadStudentDashboard() {
    try {
        const enrollmentsSnapshot = await getDocs(
            query(collection(db, 'enrollments'), where('studentEmail', '==', currentUser.email))
        );
        
        const studentCourses = document.getElementById('studentCourses');
        studentCourses.innerHTML = '';
        
        if (enrollmentsSnapshot.empty) {
            studentCourses.innerHTML = '<li>Not enrolled in any courses yet.</li>';
        } else {
            for (const enrollDoc of enrollmentsSnapshot.docs) {
                const enrollment = enrollDoc.data();
                const courseDoc = await getDoc(doc(db, 'courses', enrollment.courseId));
                
                if (courseDoc.exists()) {
                    const courseData = courseDoc.data();
                    const li = document.createElement('li');
                    const button = document.createElement('button');
                    button.textContent = courseData.name;
                    button.onclick = () => viewCourse(enrollment.courseId);
                    li.appendChild(button);
                    studentCourses.appendChild(li);
                }
            }
        }
        
        console.log('Student dashboard loaded successfully');
    } catch (error) {
        console.error('Error loading student dashboard:', error);
        alert('Error loading dashboard: ' + error.message);
    }
}

// View course (student)
async function viewCourse(courseId) {
    currentCourseId = courseId;
    
    try {
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (!courseDoc.exists()) return;
        
        const course = courseDoc.data();
        
        // Get teacher info
        let teacherName = 'None';
        if (course.teacherEmail) {
            const teacherDoc = await getDoc(doc(db, 'users', course.teacherEmail));
            if (teacherDoc.exists()) {
                const teacher = teacherDoc.data();
                teacherName = `${teacher.firstName} ${teacher.lastName}`;
            }
        }
        
        document.getElementById('studentCourseName').textContent = `${course.name} (Teacher: ${teacherName})`;
        document.getElementById('courseDetails').style.display = 'block';
        
        // Display outline
        const studentOutline = document.getElementById('studentOutline');
        studentOutline.innerHTML = '';
        let completedCount = 0;
        (course.outline || []).forEach(o => {
            const li = document.createElement('li');
            li.textContent = o.text + (o.completed ? ' (Completed)' : '');
            if (o.completed) completedCount++;
            studentOutline.appendChild(li);
        });
        const progressLi = document.createElement('li');
        progressLi.textContent = `Progress: ${completedCount}/${course.outline?.length || 0}`;
        studentOutline.appendChild(progressLi);
        
        // Display videos
        const studentVideos = document.getElementById('studentVideos');
        studentVideos.innerHTML = '';
        (course.videos || []).forEach(v => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = v;
            a.textContent = v;
            a.target = '_blank';
            li.appendChild(a);
            studentVideos.appendChild(li);
        });
        
        // Display quizzes and marks
        const studentQuizzes = document.getElementById('studentQuizzes');
        studentQuizzes.innerHTML = '';
        (course.quizzes || []).forEach(q => {
            const li = document.createElement('li');
            const mark = course.studentMarks?.[currentUser.email]?.[`quiz${q.id}`] || 'Not marked';
            li.textContent = `${q.name} - Mark: ${mark}`;
            studentQuizzes.appendChild(li);
        });
        
        // Display assignments and marks
        const studentAssignments = document.getElementById('studentAssignments');
        studentAssignments.innerHTML = '';
        (course.assignments || []).forEach(a => {
            const li = document.createElement('li');
            const mark = course.studentMarks?.[currentUser.email]?.[`assignment${a.id}`] || 'Not marked';
            li.textContent = `${a.name} - Mark: ${mark}`;
            studentAssignments.appendChild(li);
        });
    } catch (error) {
        console.error('Error viewing course:', error);
        alert('Error loading course: ' + error.message);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize admin user
    initializeAdminUser();
    
    // Form event listeners
    document.getElementById('loginForm').addEventListener('submit', login);
    document.getElementById('createUserForm')?.addEventListener('submit', createUser);
    document.getElementById('createCourseForm')?.addEventListener('submit', createCourse);
    document.getElementById('enrollForm')?.addEventListener('submit', enrollStudent);
    document.getElementById('editUserForm')?.addEventListener('submit', editUser);
    document.getElementById('editCourseForm')?.addEventListener('submit', editCourse);
    document.getElementById('addOutlineForm')?.addEventListener('submit', addOutlineTopic);
    document.getElementById('addVideoForm')?.addEventListener('submit', addVideoLink);
    document.getElementById('addQuizForm')?.addEventListener('submit', addQuiz);
    document.getElementById('addAssignmentForm')?.addEventListener('submit', addAssignment);
    
    // Start with login section
    showSection('loginSection');
    
    console.log('Application initialized');
});