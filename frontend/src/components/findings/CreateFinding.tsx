import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { FindingsService, CreateFindingServicePayload } from '../../services/findingsService';
import type { FindingSeverity, FindingCategory } from '../../types/findings';

interface Project {
  id: string;
  name: string;
  client_company: string;
  contractor_company: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface CreateFindingForm {
  title: string;
  description: string;
  location: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  project_id: string;
  assigned_to?: string;
  due_date?: string;
  regulatory_reference?: string;
  immediate_action_required: boolean;
}

const CreateFinding: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<CreateFindingForm>({
    title: '',
    description: '',
    location: '',
    severity: 'medium',
    category: 'other',
    project_id: '',
    assigned_to: '',
    due_date: '',
    regulatory_reference: '',
    immediate_action_required: false
  });

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_company, contractor_company')
        .order('name');

      if (error) {
        console.error('Error fetching projects:', error);
      } else {
        setProjects(data || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      // Since there's no dedicated users endpoint, we'll use the auth profile endpoint
      // In a real application, you'd want a dedicated endpoint for listing assignable users
      // For now, just leave it empty - users can be assigned later
      setUsers([]);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submissionData: CreateFindingServicePayload = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        severity: formData.severity as FindingSeverity,
        category: formData.category as FindingCategory,
        project_id: formData.project_id,
        assigned_to: formData.assigned_to || undefined,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // Default 14 days
        regulatory_reference: formData.regulatory_reference || undefined,
        immediate_action_required: formData.immediate_action_required,
        status: 'open'
      };

      await FindingsService.createFinding(submissionData);
      
      // Redirect to findings list
        navigate('/findings');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create finding');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  // Generate default due date (14 days from now)
  // const getDefaultDueDate = () => {
  //   const date = new Date();
  //   date.setDate(date.getDate() + 14);
  //   return date.toISOString().split('T')[0];
  // };

  if (!user || user.role !== 'client_safety_manager') {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Only Client Safety Managers can create findings.
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Create Safety Finding</h1>
        <p className="mt-2 text-sm text-gray-700">
          Report a new safety finding that needs to be addressed
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Finding Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Brief description of the safety finding"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Detailed description of the safety finding, including what was observed and potential risks"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                id="location"
                name="location"
                required
                value={formData.location}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Specific location where finding was observed"
              />
            </div>

            <div>
              <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 mb-2">
                Project *
              </label>
              <select
                id="project_id"
                name="project_id"
                required
                value={formData.project_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} - {project.client_company}
                  </option>
                ))}
              </select>
              {projects.length === 0 && (
                <p className="mt-1 text-sm text-red-600">
                  No projects available. Please create a project first.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-2">
                Severity *
              </label>
              <select
                id="severity"
                name="severity"
                required
                value={formData.severity}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                id="category"
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="fall_protection">Fall Protection</option>
                <option value="electrical_safety">Electrical Safety</option>
                <option value="ppe_compliance">PPE Compliance</option>
                <option value="housekeeping">Housekeeping</option>
                <option value="equipment_safety">Equipment Safety</option>
                <option value="environmental">Environmental</option>
                <option value="fire_safety">Fire Safety</option>
                <option value="confined_space">Confined Space</option>
                <option value="chemical_safety">Chemical Safety</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                id="due_date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Default: 14 days from creation if not specified
              </p>
            </div>

            <div>
              <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700 mb-2">
                Assign To
              </label>
              <select
                id="assigned_to"
                name="assigned_to"
                value={formData.assigned_to}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.role})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Can be assigned later if not specified
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="regulatory_reference" className="block text-sm font-medium text-gray-700 mb-2">
              Regulatory Reference
            </label>
            <input
              type="text"
              id="regulatory_reference"
              name="regulatory_reference"
              value={formData.regulatory_reference}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., OSHA 1926.501, CSA Z259.10"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="immediate_action_required"
              name="immediate_action_required"
              checked={formData.immediate_action_required}
              onChange={handleChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="immediate_action_required" className="ml-2 block text-sm text-gray-900">
              Immediate action required
            </label>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/findings')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || projects.length === 0}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Finding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFinding; 