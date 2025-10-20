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
let isInitialized = false;

// Utility function to sanitize input
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = input.trim();
    return div.innerHTML;
}

// Validate URL
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// Toggle password visibility
window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const icon = input.parentElement.querySelector('.eye-icon');
    if (!icon) return;
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

// Show modal
function showModal(title, message, modalId = 'successModal') {
    const modal = document.getElementById(modalId);
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    if (modal && modalTitle && modalMessage) {
        modalTitle.textContent = sanitizeInput(title);
        modalMessage.textContent = sanitizeInput(message);
        modal.style.display = 'flex';
    }
}

// Close modal
window.closeModal = function(modalId = 'successModal') {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// Initialize admin user in Firestore
async function initializeAdminUser() {
    const adminEmail = 'beingshah005@gmail.com';
    try {
        const adminRef = doc(db, 'users', adminEmail);
        const adminDoc = await getDoc(adminRef);
        
        if (!adminDoc.exists()) {
            await setDoc(adminRef, {
                firstName: 'Admin',
                lastName: 'User',
                email: adminEmail,
                role: 'admin',
                createdAt: new Date().toISOString()
            });
            console.log('Admin user initialized in Firestore');
        }
    } catch (error) {
        console.error('Error initializing admin:', error.message);
    }
}

// Login function
async function login(event) {
    event.preventDefault();
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const roleInput = document.getElementById('userRole');
    const loginError = document.getElementById('loginError');
    if (!emailInput || !passwordInput || !roleInput || !loginError) return;
    
    const email = sanitizeInput(emailInput.value);
    const password = passwordInput.value;
    const selectedRole = roleInput.value;
    
    if (!email || !password || !selectedRole) {
        loginError.textContent = 'All fields are required.';
        loginError.style.display = 'block';
        return;
    }
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userRef = doc(db, 'users', email);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === selectedRole) {
                currentUser = { email, ...userData };
                loginError.style.display = 'none';
                if (userData.role === 'admin') {
                    window.location.href = 'admin.html';
                } else if (userData.role === 'teacher') {
                    window.location.href = 'teacher.html';
                } else if (userData.role === 'student') {
                    window.location.href = 'student.html';
                }
            } else {
                loginError.textContent = 'Invalid role selected for this account.';
                loginError.style.display = 'block';
                await signOut(auth);
            }
        } else {
            loginError.textContent = 'User data not found. Please contact admin.';
            loginError.style.display = 'block';
            await signOut(auth);
        }
    } catch (error) {
        console.error('Login error:', error.message);
        loginError.style.display = 'block';
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            loginError.textContent = 'Invalid email or password.';
        } else if (error.code === 'auth/too-many-requests') {
            loginError.textContent = 'Too many failed attempts. Please try again later.';
        } else {
            loginError.textContent = `Login failed: ${error.message}`;
        }
    }
}

// Logout function
window.logout = async function() {
    try {
        await signOut(auth);
        currentUser = null;
        currentCourseId = null;
        window.location.href = 'login.html';
        console.log('Logged out successfully');
    } catch (error) {
        console.error('Logout error:', error.message);
        alert('Error logging out: ' + error.message);
    }
}

// Create user function
async function createUser(event) {
    event.preventDefault();
    const firstNameInput = document.getElementById('userFirstName');
    const lastNameInput = document.getElementById('userLastName');
    const emailInput = document.getElementById('userEmail');
    const passwordInput = document.getElementById('userPassword');
    const roleInput = document.getElementById('createUserRole');
    const passwordError = document.getElementById('passwordError');
    if (!firstNameInput || !lastNameInput || !emailInput || !passwordInput || !roleInput || !passwordError) return;
    
    const firstName = sanitizeInput(firstNameInput.value);
    const lastName = sanitizeInput(lastNameInput.value);
    const email = sanitizeInput(emailInput.value);
    const password = passwordInput.value;
    const role = roleInput.value;
    
    if (!firstName || !lastName || !email || !password || !role) {
        passwordError.textContent = 'All fields are required.';
        passwordError.style.display = 'block';
        return;
    }
    
    if (password.length < 6) {
        passwordError.textContent = 'Password must be at least 6 characters.';
        passwordError.style.display = 'block';
        return;
    }
    
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', email), {
            firstName,
            lastName,
            email,
            role,
            createdAt: new Date().toISOString()
        });
        console.log('User created and stored in Firestore');
        
        firstNameInput.value = '';
        lastNameInput.value = '';
        emailInput.value = '';
        passwordInput.value = '';
        roleInput.value = '';
        passwordError.style.display = 'none';
        await loadAdminDashboard();
        showModal('User Created', `User created successfully: ${firstName} ${lastName} (${email})`);
    } catch (error) {
        console.error('Create user error:', error.message);
        passwordError.style.display = 'none';
        if (error.code === 'auth/email-already-in-use') {
            alert('Email already exists.');
        } else if (error.code === 'auth/invalid-email') {
            alert('Invalid email format.');
        } else {
            alert(`Error creating user: ${error.message}`);
        }
    }
}

// Load admin dashboard
async function loadAdminDashboard() {
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }
    
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    
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
        
        const teacherSelect = document.getElementById('courseTeacher');
        if (teacherSelect) {
            teacherSelect.innerHTML = '<option value="" disabled selected>Select Teacher</option>';
            users.filter(u => u.role === 'teacher').forEach(t => {
                const option = document.createElement('option');
                option.value = t.email;
                option.textContent = `${t.firstName} ${t.lastName} (${t.email})`;
                teacherSelect.appendChild(option);
            });
        }
        
        const studentSelect = document.getElementById('enrollStudent');
        if (studentSelect) {
            studentSelect.innerHTML = '<option value="" disabled selected>Select Student</option>';
            users.filter(u => u.role === 'student').forEach(s => {
                const option = document.createElement('option');
                option.value = s.email;
                option.textContent = `${s.firstName} ${s.lastName} (${s.email})`;
                studentSelect.appendChild(option);
            });
        }
        
        const courseSelect = document.getElementById('enrollCourse');
        if (courseSelect) {
            courseSelect.innerHTML = '<option value="" disabled selected>Select Course</option>';
            courses.forEach(c => {
                const option = document.createElement('option');
                option.value = c.id;
                option.textContent = c.name;
                courseSelect.appendChild(option);
            });
        }
        
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
        
        const coursesList = document.getElementById('coursesList');
        if (coursesList) {
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
        }
        
        const enrollmentsList = document.getElementById('enrollmentsList');
        if (enrollmentsList) {
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
        }
        
        console.log('Admin dashboard loaded successfully');
    } catch (error) {
        console.error('Error loading admin dashboard:', error.message);
        alert(`Error loading dashboard: ${error.message}`);
    }
}

// Delete user
async function deleteUser(userEmail) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        await deleteDoc(doc(db, 'users', userEmail));
        
        const enrollmentsSnapshot = await getDocs(
            query(collection(db, 'enrollments'), where('studentEmail', '==', userEmail))
        );
        for (const enrollDoc of enrollmentsSnapshot.docs) {
            await deleteDoc(doc(db, 'enrollments', enrollDoc.id));
        }
        
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
        console.error('Error deleting user:', error.message);
        alert(`Error deleting user: ${error.message}`);
    }
}

// Open edit user modal
async function openEditUserModal(userEmail) {
    const editUserId = document.getElementById('editUserId');
    const editUserFirstName = document.getElementById('editUserFirstName');
    const editUserLastName = document.getElementById('editUserLastName');
    const editUserEmail = document.getElementById('editUserEmail');
    const editUserModal = document.getElementById('editUserModal');
    if (!editUserId || !editUserFirstName || !editUserLastName || !editUserEmail || !editUserModal) return;
    
    try {
        const userDoc = await getDoc(doc(db, 'users', userEmail));
        if (!userDoc.exists()) return;
        
        const userData = userDoc.data();
        editUserId.value = userEmail;
        editUserFirstName.value = userData.firstName;
        editUserLastName.value = userData.lastName;
        editUserEmail.value = userData.email;
        editUserModal.style.display = 'flex';
    } catch (error) {
        console.error('Error opening edit user modal:', error.message);
        alert(`Error opening edit user modal: ${error.message}`);
    }
}

// Edit user
async function editUser(event) {
    event.preventDefault();
    const editUserId = document.getElementById('editUserId');
    const editUserFirstName = document.getElementById('editUserFirstName');
    const editUserLastName = document.getElementById('editUserLastName');
    if (!editUserId || !editUserFirstName || !editUserLastName) return;
    
    const userEmail = editUserId.value;
    const firstName = sanitizeInput(editUserFirstName.value);
    const lastName = sanitizeInput(editUserLastName.value);
    
    if (!firstName || !lastName) {
        alert('First name and last name are required.');
        return;
    }
    
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
        console.error('Error updating user:', error.message);
        alert(`Error updating user: ${error.message}`);
    }
}

// Create course
async function createCourse(event) {
    event.preventDefault();
    const courseNameInput = document.getElementById('courseName');
    const courseTeacherInput = document.getElementById('courseTeacher');
    if (!courseNameInput || !courseTeacherInput) return;
    
    const name = sanitizeInput(courseNameInput.value);
    const teacherEmail = courseTeacherInput.value;
    
    if (!name || !teacherEmail) {
        alert('Course name and teacher are required.');
        return;
    }
    
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
        
        courseNameInput.value = '';
        courseTeacherInput.value = '';
        await loadAdminDashboard();
        showModal('Course Created', `Course "${name}" created successfully.`);
    } catch (error) {
        console.error('Error creating course:', error.message);
        alert(`Error creating course: ${error.message}`);
    }
}

// Open edit course modal
async function openEditCourseModal(courseId) {
    const editCourseId = document.getElementById('editCourseId');
    const editCourseName = document.getElementById('editCourseName');
    const editCourseTeacher = document.getElementById('editCourseTeacher');
    const editCourseModal = document.getElementById('editCourseModal');
    if (!editCourseId || !editCourseName || !editCourseTeacher || !editCourseModal) return;
    
    try {
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (!courseDoc.exists()) return;
        
        const courseData = courseDoc.data();
        editCourseId.value = courseId;
        editCourseName.value = courseData.name;
        
        editCourseTeacher.innerHTML = '<option value="" disabled>Select Teacher</option>';
        const usersSnapshot = await getDocs(collection(db, 'users'));
        usersSnapshot.forEach(userDoc => {
            const userData = userDoc.data();
            if (userData.role === 'teacher') {
                const option = document.createElement('option');
                option.value = userData.email;
                option.textContent = `${userData.firstName} ${userData.lastName} (${userData.email})`;
                if (userData.email === courseData.teacherEmail) option.selected = true;
                editCourseTeacher.appendChild(option);
            }
        });
        
        editCourseModal.style.display = 'flex';
    } catch (error) {
        console.error('Error opening edit course modal:', error.message);
        alert(`Error opening edit course modal: ${error.message}`);
    }
}

// Edit course
async function editCourse(event) {
    event.preventDefault();
    const editCourseId = document.getElementById('editCourseId');
    const editCourseName = document.getElementById('editCourseName');
    const editCourseTeacher = document.getElementById('editCourseTeacher');
    if (!editCourseId || !editCourseName || !editCourseTeacher) return;
    
    const courseId = editCourseId.value;
    const name = sanitizeInput(editCourseName.value);
    const teacherEmail = editCourseTeacher.value;
    
    if (!name || !teacherEmail) {
        alert('Course name and teacher are required.');
        return;
    }
    
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
        console.error('Error updating course:', error.message);
        alert(`Error updating course: ${error.message}`);
    }
}

// Delete course
async function deleteCourse(courseId) {
    if (!confirm('Are you sure you want to delete this course?')) return;
    
    try {
        await deleteDoc(doc(db, 'courses', courseId));
        
        const enrollmentsSnapshot = await getDocs(
            query(collection(db, 'enrollments'), where('courseId', '==', courseId))
        );
        for (const enrollDoc of enrollmentsSnapshot.docs) {
            await deleteDoc(doc(db, 'enrollments', enrollDoc.id));
        }
        
        await loadAdminDashboard();
        showModal('Course Deleted', 'Course deleted successfully.');
    } catch (error) {
        console.error('Error deleting course:', error.message);
        alert(`Error deleting course: ${error.message}`);
    }
}

// Enroll student
async function enrollStudent(event) {
    event.preventDefault();
    const enrollStudentInput = document.getElementById('enrollStudent');
    const enrollCourseInput = document.getElementById('enrollCourse');
    if (!enrollStudentInput || !enrollCourseInput) return;
    
    const studentEmail = enrollStudentInput.value;
    const courseId = enrollCourseInput.value;
    
    if (!studentEmail || !courseId) {
        alert('Student and course are required.');
        return;
    }
    
    try {
        const enrollmentsSnapshot = await getDocs(
            query(
                collection(db, 'enrollments'),
                where('studentEmail', '==', studentEmail),
                where('courseId', '==', courseId)
            )
        );
        
        if (!enrollmentsSnapshot.empty) {
            alert('Student already enrolled in this course.');
            return;
        }
        
        const enrollRef = doc(collection(db, 'enrollments'));
        await setDoc(enrollRef, {
            studentEmail,
            courseId,
            enrolledAt: new Date().toISOString()
        });
        
        enrollStudentInput.value = '';
        enrollCourseInput.value = '';
        await loadAdminDashboard();
        showModal('Enrollment Success', 'Student enrolled successfully.');
    } catch (error) {
        console.error('Error enrolling student:', error.message);
        alert(`Error enrolling student: ${error.message}`);
    }
}

// Load teacher dashboard
async function loadTeacherDashboard() {
    if (!currentUser || currentUser.role !== 'teacher') {
        window.location.href = 'login.html';
        return;
    }
    
    const teacherCourses = document.getElementById('teacherCourses');
    if (!teacherCourses) return;
    
    try {
        const coursesSnapshot = await getDocs(
            query(collection(db, 'courses'), where('teacherEmail', '==', currentUser.email))
        );
        
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
        console.error('Error loading teacher dashboard:', error.message);
        alert(`Error loading dashboard: ${error.message}`);
    }
}

// Manage course (teacher)
async function manageCourse(courseId) {
    currentCourseId = courseId;
    
    const courseManagement = document.getElementById('courseManagement');
    if (!courseManagement) return;
    
    try {
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (!courseDoc.exists()) {
            alert('Course not found.');
            return;
        }
        
        const course = courseDoc.data();
        const currentCourseName = document.getElementById('currentCourseName');
        if (currentCourseName) {
            currentCourseName.textContent = course.name;
            courseManagement.style.display = 'block';
        }
        
        const outlineList = document.getElementById('outlineList');
        if (outlineList) {
            outlineList.innerHTML = '';
            (course.outline || []).forEach((topic, index) => {
                const li = document.createElement('li');
                li.textContent = topic.text;
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = topic.completed || false;
                checkbox.onchange = async () => {
                    try {
                        const updatedOutline = [...course.outline];
                        updatedOutline[index].completed = checkbox.checked;
                        await updateDoc(doc(db, 'courses', courseId), { outline: updatedOutline });
                    } catch (error) {
                        console.error('Error updating outline:', error.message);
                        alert(`Error updating outline: ${error.message}`);
                    }
                };
                li.appendChild(checkbox);
                outlineList.appendChild(li);
            });
        }
        
        const videoList = document.getElementById('videoList');
        if (videoList) {
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
        }
        
        const quizList = document.getElementById('quizList');
        if (quizList) {
            quizList.innerHTML = '';
            (course.quizzes || []).forEach(q => {
                const li = document.createElement('li');
                li.textContent = q.name;
                quizList.appendChild(li);
            });
        }
        
        const assignmentList = document.getElementById('assignmentList');
        if (assignmentList) {
            assignmentList.innerHTML = '';
            (course.assignments || []).forEach(a => {
                const li = document.createElement('li');
                li.textContent = a.name;
                assignmentList.appendChild(li);
            });
        }
        
        const studentsMarks = document.getElementById('studentsMarks');
        if (studentsMarks) {
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
                    
                    (course.quizzes || []).forEach(q => {
                        const input = document.createElement('input');
                        input.type = 'number';
                        input.placeholder = `Mark for ${q.name}`;
                        input.value = course.studentMarks?.[enrollment.studentEmail]?.[`quiz${q.id}`] || '';
                        input.onchange = async () => {
                            try {
                                const marks = course.studentMarks || {};
                                if (!marks[enrollment.studentEmail]) marks[enrollment.studentEmail] = {};
                                marks[enrollment.studentEmail][`quiz${q.id}`] = parseInt(input.value) || 0;
                                await updateDoc(doc(db, 'courses', courseId), { studentMarks: marks });
                            } catch (error) {
                                console.error('Error updating quiz mark:', error.message);
                                alert(`Error updating quiz mark: ${error.message}`);
                            }
                        };
                        div.appendChild(input);
                        div.appendChild(document.createElement('br'));
                    });
                    
                    (course.assignments || []).forEach(a => {
                        const input = document.createElement('input');
                        input.type = 'number';
                        input.placeholder = `Mark for ${a.name}`;
                        input.value = course.studentMarks?.[enrollment.studentEmail]?.[`assignment${a.id}`] || '';
                        input.onchange = async () => {
                            try {
                                const marks = course.studentMarks || {};
                                if (!marks[enrollment.studentEmail]) marks[enrollment.studentEmail] = {};
                                marks[enrollment.studentEmail][`assignment${a.id}`] = parseInt(input.value) || 0;
                                await updateDoc(doc(db, 'courses', courseId), { studentMarks: marks });
                            } catch (error) {
                                console.error('Error updating assignment mark:', error.message);
                                alert(`Error updating assignment mark: ${error.message}`);
                            }
                        };
                        div.appendChild(input);
                        div.appendChild(document.createElement('br'));
                    });
                    
                    studentsMarks.appendChild(div);
                }
            }
        }
        
        console.log('Course management loaded successfully');
    } catch (error) {
        console.error('Error managing course:', error.message);
        alert(`Error loading course: ${error.message}`);
    }
}

// Add outline topic
async function addOutlineTopic(event) {
    event.preventDefault();
    const outlineTopicInput = document.getElementById('outlineTopic');
    if (!outlineTopicInput) return;
    
    const topic = sanitizeInput(outlineTopicInput.value);
    if (!topic) {
        alert('Topic is required.');
        return;
    }
    
    try {
        const courseDoc = await getDoc(doc(db, 'courses', currentCourseId));
        if (!courseDoc.exists()) {
            alert('Course not found.');
            return;
        }
        const course = courseDoc.data();
        const outline = course.outline || [];
        const newId = outline.length ? Math.max(...outline.map(o => o.id)) + 1 : 1;
        outline.push({ id: newId, text: topic, completed: false });
        
        await updateDoc(doc(db, 'courses', currentCourseId), { outline });
        outlineTopicInput.value = '';
        await manageCourse(currentCourseId);
    } catch (error) {
        console.error('Error adding outline topic:', error.message);
        alert(`Error adding topic: ${error.message}`);
    }
}

// Add video link
async function addVideoLink(event) {
    event.preventDefault();
    const videoLinkInput = document.getElementById('videoLink');
    if (!videoLinkInput) return;
    
    const link = sanitizeInput(videoLinkInput.value);
    if (!link) {
        alert('Video URL is required.');
        return;
    }
    if (!isValidUrl(link)) {
        alert('Invalid URL format.');
        return;
    }
    
    try {
        const courseDoc = await getDoc(doc(db, 'courses', currentCourseId));
        if (!courseDoc.exists()) {
            alert('Course not found.');
            return;
        }
        const course = courseDoc.data();
        const videos = course.videos || [];
        videos.push(link);
        
        await updateDoc(doc(db, 'courses', currentCourseId), { videos });
        videoLinkInput.value = '';
        await manageCourse(currentCourseId);
    } catch (error) {
        console.error('Error adding video:', error.message);
        alert(`Error adding video: ${error.message}`);
    }
}

// Add quiz
async function addQuiz(event) {
    event.preventDefault();
    const quizNameInput = document.getElementById('quizName');
    if (!quizNameInput) return;
    
    const name = sanitizeInput(quizNameInput.value);
    if (!name) {
        alert('Quiz name is required.');
        return;
    }
    
    try {
        const courseDoc = await getDoc(doc(db, 'courses', currentCourseId));
        if (!courseDoc.exists()) {
            alert('Course not found.');
            return;
        }
        const course = courseDoc.data();
        const quizzes = course.quizzes || [];
        const newId = quizzes.length ? Math.max(...quizzes.map(q => q.id)) + 1 : 1;
        quizzes.push({ id: newId, name });
        
        await updateDoc(doc(db, 'courses', currentCourseId), { quizzes });
        quizNameInput.value = '';
        await manageCourse(currentCourseId);
    } catch (error) {
        console.error('Error adding quiz:', error.message);
        alert(`Error adding quiz: ${error.message}`);
    }
}

// Add assignment
async function addAssignment(event) {
    event.preventDefault();
    const assignmentNameInput = document.getElementById('assignmentName');
    if (!assignmentNameInput) return;
    
    const name = sanitizeInput(assignmentNameInput.value);
    if (!name) {
        alert('Assignment name is required.');
        return;
    }
    
    try {
        const courseDoc = await getDoc(doc(db, 'courses', currentCourseId));
        if (!courseDoc.exists()) {
            alert('Course not found.');
            return;
        }
        const course = courseDoc.data();
        const assignments = course.assignments || [];
        const newId = assignments.length ? Math.max(...assignments.map(a => a.id)) + 1 : 1;
        assignments.push({ id: newId, name });
        
        await updateDoc(doc(db, 'courses', currentCourseId), { assignments });
        assignmentNameInput.value = '';
        await manageCourse(currentCourseId);
    } catch (error) {
        console.error('Error adding assignment:', error.message);
        alert(`Error adding assignment: ${error.message}`);
    }
}

// Load student dashboard
async function loadStudentDashboard() {
    if (!currentUser || currentUser.role !== 'student') {
        window.location.href = 'login.html';
        return;
    }
    
    const studentCourses = document.getElementById('studentCourses');
    if (!studentCourses) return;
    
    try {
        const enrollmentsSnapshot = await getDocs(
            query(collection(db, 'enrollments'), where('studentEmail', '==', currentUser.email))
        );
        
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
        console.error('Error loading student dashboard:', error.message);
        alert(`Error loading dashboard: ${error.message}`);
    }
}

// View course (student)
async function viewCourse(courseId) {
    currentCourseId = courseId;
    
    const courseDetails = document.getElementById('courseDetails');
    if (!courseDetails) return;
    
    try {
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (!courseDoc.exists()) {
            alert('Course not found.');
            return;
        }
        
        const course = courseDoc.data();
        
        let teacherName = 'None';
        if (course.teacherEmail) {
            const teacherDoc = await getDoc(doc(db, 'users', course.teacherEmail));
            if (teacherDoc.exists()) {
                const teacher = teacherDoc.data();
                teacherName = `${teacher.firstName} ${teacher.lastName}`;
            }
        }
        
        const studentCourseName = document.getElementById('studentCourseName');
        if (studentCourseName) {
            studentCourseName.textContent = `${course.name} (Teacher: ${teacherName})`;
            courseDetails.style.display = 'block';
        }
        
        const studentOutline = document.getElementById('studentOutline');
        if (studentOutline) {
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
        }
        
        const studentVideos = document.getElementById('studentVideos');
        if (studentVideos) {
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
        }
        
        const studentQuizzes = document.getElementById('studentQuizzes');
        if (studentQuizzes) {
            studentQuizzes.innerHTML = '';
            (course.quizzes || []).forEach(q => {
                const li = document.createElement('li');
                const mark = course.studentMarks?.[currentUser.email]?.[`quiz${q.id}`] || 'Not marked';
                li.textContent = `${q.name} - Mark: ${mark}`;
                studentQuizzes.appendChild(li);
            });
        }
        
        const studentAssignments = document.getElementById('studentAssignments');
        if (studentAssignments) {
            studentAssignments.innerHTML = '';
            (course.assignments || []).forEach(a => {
                const li = document.createElement('li');
                const mark = course.studentMarks?.[currentUser.email]?.[`assignment${a.id}`] || 'Not marked';
                li.textContent = `${a.name} - Mark: ${mark}`;
                studentAssignments.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Error viewing course:', error.message);
        alert(`Error loading course: ${error.message}`);
    }
}

// Initialize page
function initializePage() {
    if (isInitialized) return;
    isInitialized = true;
    
    const path = window.location.pathname.split('/').pop();
    
    if (path === 'index.html') {
        return; // Splash screen handles redirect
    }
    
    const logoutButton = document.querySelector('.logout');
    if (logoutButton && path === 'login.html') {
        logoutButton.style.display = 'none';
    } else if (logoutButton) {
        logoutButton.style.display = 'block';
    }
    
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, 'users', user.email));
            if (userDoc.exists()) {
                currentUser = { email: user.email, ...userDoc.data() };
                
                if (path === 'login.html') {
                    if (currentUser.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else if (currentUser.role === 'teacher') {
                        window.location.href = 'teacher.html';
                    } else if (currentUser.role === 'student') {
                        window.location.href = 'student.html';
                    }
                } else if (path === 'admin.html' && currentUser.role === 'admin') {
                    await loadAdminDashboard();
                } else if (path === 'teacher.html' && currentUser.role === 'teacher') {
                    await loadTeacherDashboard();
                } else if (path === 'student.html' && currentUser.role === 'student') {
                    await loadStudentDashboard();
                } else {
                    await signOut(auth);
                    window.location.href = 'login.html';
                }
            } else {
                await signOut(auth);
                window.location.href = 'login.html';
            }
        } else {
            if (path !== 'login.html') {
                window.location.href = 'login.html';
            }
        }
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.split('/').pop();
    
    if (path === 'login.html' || path === 'admin.html') {
        initializeAdminUser();
    }
    
    if (path === 'login.html') {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.addEventListener('submit', login);
    } else if (path === 'admin.html') {
        const createUserForm = document.getElementById('createUserForm');
        if (createUserForm) createUserForm.addEventListener('submit', createUser);
        
        const createCourseForm = document.getElementById('createCourseForm');
        if (createCourseForm) createCourseForm.addEventListener('submit', createCourse);
        
        const enrollForm = document.getElementById('enrollForm');
        if (enrollForm) enrollForm.addEventListener('submit', enrollStudent);
        
        const editUserForm = document.getElementById('editUserForm');
        if (editUserForm) editUserForm.addEventListener('submit', editUser);
        
        const editCourseForm = document.getElementById('editCourseForm');
        if (editCourseForm) editCourseForm.addEventListener('submit', editCourse);
    } else if (path === 'teacher.html') {
        const addOutlineForm = document.getElementById('addOutlineForm');
        if (addOutlineForm) addOutlineForm.addEventListener('submit', addOutlineTopic);
        
        const addVideoForm = document.getElementById('addVideoForm');
        if (addVideoForm) addVideoForm.addEventListener('submit', addVideoLink);
        
        const addQuizForm = document.getElementById('addQuizForm');
        if (addQuizForm) addQuizForm.addEventListener('submit', addQuiz);
        
        const addAssignmentForm = document.getElementById('addAssignmentForm');
        if (addAssignmentForm) addAssignmentForm.addEventListener('submit', addAssignment);
    }
    
    initializePage();
    
    console.log('Application initialized');
});