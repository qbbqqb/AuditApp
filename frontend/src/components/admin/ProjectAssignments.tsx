import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getAllUsersWithProfiles } from '../../services/profileService';
import { getAllProjects, assignUserToProject, removeUserFromProject, getUsersForProject, getProjectsForUser } from '../../services/projectService';
import type { Profile, Project } from '../../types/supabase';



const ProjectAssignments: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [projectUsers, setProjectUsers] = useState<Profile[]>([]);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState<'by-project' | 'by-user'>('by-project');

  // Define callback functions first
  const loadProjectUsers = useCallback(async () => {
    if (!selectedProject) return;
    
    try {
      const users = await getUsersForProject(selectedProject);
      setProjectUsers(users);
    } catch (error) {
      console.error('Error loading project users:', error);
    }
  }, [selectedProject]);

  const loadUserProjects = useCallback(async () => {
    if (!selectedUser) return;
    
    try {
      const projects = await getProjectsForUser(selectedUser);
      setUserProjects(projects);
    } catch (error) {
      console.error('Error loading user projects:', error);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      loadData();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedProject && viewMode === 'by-project') {
      loadProjectUsers();
    }
  }, [selectedProject, viewMode, loadProjectUsers]);

  useEffect(() => {
    if (selectedUser && viewMode === 'by-user') {
      loadUserProjects();
    }
  }, [selectedUser, viewMode, loadUserProjects]);

  // Check if user is admin after hooks are called
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
            <p className="mt-2 text-sm text-gray-500">
              You must be an administrator to access project assignments.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, projectsData] = await Promise.all([
        getAllUsersWithProfiles(),
        getAllProjects()
      ]);
      
      // Filter to only active users and projects
      setUsers(usersData.filter(u => u.is_active));
      setProjects(projectsData.filter(p => p.is_active));
    } catch (error) {
      setError('Failed to load data');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUser = async () => {
    if (!selectedProject || !selectedUser) return;
    
    setAssigning(true);
    setError('');
    setSuccess('');

    try {
      await assignUserToProject(selectedUser, selectedProject);
      setSuccess('User assigned to project successfully');
      
      if (viewMode === 'by-project') {
        await loadProjectUsers();
      } else {
        await loadUserProjects();
      }
    } catch (error) {
      setError('Failed to assign user to project');
      console.error('Error assigning user:', error);
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (userId: string, projectId: string) => {
    try {
      await removeUserFromProject(userId, projectId);
      setSuccess('User removed from project successfully');
      
      if (viewMode === 'by-project') {
        await loadProjectUsers();
      } else {
        await loadUserProjects();
      }
    } catch (error) {
      setError('Failed to remove user from project');
      console.error('Error removing assignment:', error);
    }
  };

  const getAvailableUsers = () => {
    return users.filter(user => !projectUsers.some(pu => pu.id === user.id));
  };

  const getAvailableProjects = () => {
    return projects.filter(project => !userProjects.some(up => up.id === project.id));
  };

  const formatRoleName = (role: string) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <span className="mt-2 text-gray-600">Loading project assignments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Project Assignments</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage user assignments to projects
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setViewMode('by-project')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                viewMode === 'by-project'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              View by Project
            </button>
            <button
              onClick={() => setViewMode('by-user')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                viewMode === 'by-user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              View by User
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Assignment Form */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {viewMode === 'by-project' ? 'Assign User to Project' : 'Assign Project to User'}
            </h2>
            
            <div className="space-y-4">
              {viewMode === 'by-project' ? (
                <>
                  <div>
                    <label htmlFor="project-select" className="block text-sm font-medium text-gray-700 mb-2">
                      Select Project
                    </label>
                    <select
                      id="project-select"
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Choose a project...</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name} - {project.client_company}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedProject && (
                    <div>
                      <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 mb-2">
                        Select User to Assign
                      </label>
                      <select
                        id="user-select"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Choose a user...</option>
                        {getAvailableUsers().map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.first_name} {user.last_name} ({formatRoleName(user.role)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 mb-2">
                      Select User
                    </label>
                    <select
                      id="user-select"
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Choose a user...</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} ({formatRoleName(user.role)})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedUser && (
                    <div>
                      <label htmlFor="project-select" className="block text-sm font-medium text-gray-700 mb-2">
                        Select Project to Assign
                      </label>
                      <select
                        id="project-select"
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Choose a project...</option>
                        {getAvailableProjects().map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name} - {project.client_company}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
              
              <button
                onClick={handleAssignUser}
                disabled={!selectedProject || !selectedUser || assigning}
                className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigning ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>

          {/* Current Assignments */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Current Assignments
            </h2>
            
            {viewMode === 'by-project' && selectedProject ? (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Users assigned to: {projects.find(p => p.id === selectedProject)?.name}
                </h3>
                {projectUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">No users assigned to this project.</p>
                ) : (
                  <div className="space-y-2">
                    {projectUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatRoleName(user.role)} - {user.company}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveAssignment(user.id, selectedProject)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : viewMode === 'by-user' && selectedUser ? (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Projects assigned to: {users.find(u => u.id === selectedUser)?.first_name} {users.find(u => u.id === selectedUser)?.last_name}
                </h3>
                {userProjects.length === 0 ? (
                  <p className="text-sm text-gray-500">No projects assigned to this user.</p>
                ) : (
                  <div className="space-y-2">
                    {userProjects.map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {project.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {project.client_company} - {project.contractor_company}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveAssignment(selectedUser, project.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Select a {viewMode === 'by-project' ? 'project' : 'user'} to view assignments.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectAssignments; 