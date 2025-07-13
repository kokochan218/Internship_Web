import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({});

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserProfile(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        fetchDashboardStats(token);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const handleLogin = async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        setUser(data.user);
        fetchDashboardStats(data.token);
      } else {
        alert('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setStats({});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={handleLogout} />
      <div className="flex">
        <Sidebar user={user} activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6">
          <MainContent user={user} activeTab={activeTab} stats={stats} />
        </main>
      </div>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-2xl">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Internship Monitoring System
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Information Systems Program - Telkom University
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in
            </button>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Demo accounts: <br />
              <strong>Kaprodi:</strong> kaprodi / kaprodi123<br />
              <strong>Student:</strong> student1 / student123
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

function Header({ user, onLogout }) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              Internship Monitoring System
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">Welcome, {user.full_name}</span>
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {user.role === 'kaprodi' ? 'Head of Program' : 'Student'}
            </span>
            <button
              onClick={onLogout}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ user, activeTab, setActiveTab }) {
  const kaprodMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'students', label: 'Students', icon: '👥' },
    { id: 'internships', label: 'Internship Programs', icon: '🏢' },
    { id: 'applications', label: 'Applications', icon: '📋' },
    { id: 'reports', label: 'Reports', icon: '📄' },
    { id: 'evaluations', label: 'Evaluations', icon: '⭐' }
  ];

  const studentMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'internships', label: 'Browse Programs', icon: '🏢' },
    { id: 'applications', label: 'My Applications', icon: '📋' },
    { id: 'reports', label: 'My Reports', icon: '📄' },
    { id: 'evaluations', label: 'My Evaluations', icon: '⭐' }
  ];

  const menuItems = user.role === 'kaprodi' ? kaprodMenuItems : studentMenuItems;

  return (
    <nav className="bg-white w-64 shadow-sm h-screen overflow-y-auto">
      <div className="p-4">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === item.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

function MainContent({ user, activeTab, stats }) {
  switch (activeTab) {
    case 'dashboard':
      return <Dashboard user={user} stats={stats} />;
    case 'students':
      return user.role === 'kaprodi' ? <StudentsManagement /> : <div>Access Denied</div>;
    case 'internships':
      return <InternshipsManagement user={user} />;
    case 'applications':
      return <ApplicationsManagement user={user} />;
    case 'reports':
      return <ReportsManagement user={user} />;
    case 'evaluations':
      return <EvaluationsManagement user={user} />;
    default:
      return <Dashboard user={user} stats={stats} />;
  }
}

function Dashboard({ user, stats }) {
  if (user.role === 'kaprodi') {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard - Head of Program</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Students" value={stats.total_students || 0} color="blue" />
          <StatCard title="Internship Programs" value={stats.total_internships || 0} color="green" />
          <StatCard title="Reports Submitted" value={stats.total_reports || 0} color="purple" />
          <StatCard title="Pending Applications" value={stats.pending_applications || 0} color="orange" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivity />
          <QuickActions />
        </div>
      </div>
    );
  } else {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard - Student</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="My Applications" value={stats.applications || 0} color="blue" />
          <StatCard title="Reports Submitted" value={stats.reports || 0} color="green" />
          <StatCard title="Evaluations Received" value={stats.evaluations || 0} color="purple" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StudentProgress />
          <UpcomingDeadlines />
        </div>
      </div>
    );
  }
}

function StatCard({ title, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${colorClasses[color]} text-white`}>
          <span className="text-xl font-bold">{value}</span>
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      </div>
    </div>
  );
}

function StudentsManagement() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/students`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading students...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Students Management</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Add New Student
        </button>
      </div>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {students.map((student) => (
            <li key={student.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white font-medium">
                      {student.full_name.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-900">{student.full_name}</div>
                  <div className="text-sm text-gray-500">{student.email}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  {student.student_id}
                </span>
                <button className="text-blue-600 hover:text-blue-800">Edit</button>
                <button className="text-red-600 hover:text-red-800">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function InternshipsManagement({ user }) {
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInternships();
  }, []);

  const fetchInternships = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/internships`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setInternships(data);
      }
    } catch (error) {
      console.error('Error fetching internships:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading internships...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {user.role === 'kaprodi' ? 'Internship Programs Management' : 'Browse Internship Programs'}
        </h2>
        {user.role === 'kaprodi' && (
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Add New Program
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {internships.map((internship) => (
          <div key={internship.id} className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{internship.title}</h3>
            <p className="text-gray-600 mb-2">{internship.company_name}</p>
            <p className="text-sm text-gray-500 mb-4">{internship.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Duration: {internship.duration}</span>
              <span className="text-sm text-gray-500">Max: {internship.max_students}</span>
            </div>
            <div className="mt-4 flex space-x-2">
              {user.role === 'student' ? (
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm">
                  Apply
                </button>
              ) : (
                <>
                  <button className="bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700 text-sm">
                    Edit
                  </button>
                  <button className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-sm">
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApplicationsManagement({ user }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/applications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setApplications(data);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading applications...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {user.role === 'kaprodi' ? 'Applications Management' : 'My Applications'}
      </h2>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {applications.map((application) => (
            <li key={application.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {application.internship_title}
                  </h3>
                  {user.role === 'kaprodi' && (
                    <p className="text-sm text-gray-500">Student: {application.student_name}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Applied: {new Date(application.applied_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    application.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    application.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {application.status}
                  </span>
                  {user.role === 'kaprodi' && application.status === 'pending' && (
                    <div className="flex space-x-2">
                      <button className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm">
                        Approve
                      </button>
                      <button className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-sm">
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ReportsManagement({ user }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/reports`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading reports...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {user.role === 'kaprodi' ? 'Reports Management' : 'My Reports'}
        </h2>
        {user.role === 'student' && (
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Submit New Report
          </button>
        )}
      </div>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {reports.map((report) => (
            <li key={report.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{report.title}</h3>
                  <p className="text-sm text-gray-500">Internship: {report.internship_title}</p>
                  {user.role === 'kaprodi' && (
                    <p className="text-sm text-gray-500">Student: {report.student_name}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Submitted: {new Date(report.submitted_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    report.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                    report.status === 'reviewed' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {report.status}
                  </span>
                  <button className="text-blue-600 hover:text-blue-800">View</button>
                  {user.role === 'kaprodi' && (
                    <button className="text-green-600 hover:text-green-800">Review</button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function EvaluationsManagement({ user }) {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/evaluations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setEvaluations(data);
      }
    } catch (error) {
      console.error('Error fetching evaluations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading evaluations...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {user.role === 'kaprodi' ? 'Evaluations Management' : 'My Evaluations'}
        </h2>
        {user.role === 'kaprodi' && (
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Add New Evaluation
          </button>
        )}
      </div>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {evaluations.map((evaluation) => (
            <li key={evaluation.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Grade: {evaluation.grade}
                  </h3>
                  <p className="text-sm text-gray-500">Internship: {evaluation.internship_title}</p>
                  {user.role === 'kaprodi' && (
                    <p className="text-sm text-gray-500">Student: {evaluation.student_name}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Evaluated: {new Date(evaluation.evaluated_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">{evaluation.feedback}</p>
                </div>
                <div className="flex items-center space-x-4">
                  {user.role === 'kaprodi' && (
                    <button className="text-blue-600 hover:text-blue-800">Edit</button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function RecentActivity() {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        <div className="flex items-center">
          <div className="h-2 w-2 bg-blue-500 rounded-full mr-3"></div>
          <span className="text-sm text-gray-600">New student application received</span>
        </div>
        <div className="flex items-center">
          <div className="h-2 w-2 bg-green-500 rounded-full mr-3"></div>
          <span className="text-sm text-gray-600">Report submitted by Ahmad Mahasiswa</span>
        </div>
        <div className="flex items-center">
          <div className="h-2 w-2 bg-purple-500 rounded-full mr-3"></div>
          <span className="text-sm text-gray-600">New internship program added</span>
        </div>
      </div>
    </div>
  );
}

function QuickActions() {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
      <div className="space-y-3">
        <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
          Add New Student
        </button>
        <button className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
          Create Internship Program
        </button>
        <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700">
          Review Applications
        </button>
      </div>
    </div>
  );
}

function StudentProgress() {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">My Progress</h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm text-gray-600">Application Status</span>
            <span className="text-sm text-gray-600">75%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm text-gray-600">Reports Submitted</span>
            <span className="text-sm text-gray-600">60%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UpcomingDeadlines() {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Upcoming Deadlines</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Weekly Report</span>
          <span className="text-sm text-red-600">Due in 2 days</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Monthly Evaluation</span>
          <span className="text-sm text-orange-600">Due in 1 week</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Final Presentation</span>
          <span className="text-sm text-blue-600">Due in 2 weeks</span>
        </div>
      </div>
    </div>
  );
}

export default App;