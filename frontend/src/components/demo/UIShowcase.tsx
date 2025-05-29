import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  IconButton,
  LoadingButton,
  FloatingActionButton,
  Modal,
  ModalBody,
  ModalFooter,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SeverityIndicator,
  StatusIndicator,
  PriorityBadge,
  ProgressIndicator,
  ThemeToggle,
  SimpleThemeToggle,
  AnimatedThemeToggle
} from '../ui';

import { useTheme } from '../../contexts/ThemeContext';

import {
  PlusIcon,
  HeartIcon,
  ShareIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';

const UIShowcase: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [glassModalOpen, setGlassModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSkeletons, setShowSkeletons] = useState(false);
  const { theme, effectiveTheme } = useTheme();

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">UI Component Showcase</h1>
          <p className="text-secondary">Demonstration of the enhanced UI components with modern design system and dark mode support</p>
          <div className="mt-4 p-4 bg-surface border border-default rounded-lg">
            <p className="text-sm text-tertiary">
              Current theme: <span className="font-medium text-primary">{theme}</span> 
              {theme === 'system' && <span> (resolved to {effectiveTheme})</span>}
            </p>
          </div>
        </div>

        {/* Theme Controls Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-primary">Theme Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Standard Theme Toggle</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <ThemeToggle showLabel />
                  <ThemeToggle variant="dropdown" showLabel />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Simple Toggle</h3>
              </CardHeader>
              <CardBody>
                <div className="flex justify-center">
                  <SimpleThemeToggle />
                </div>
                <p className="text-sm text-secondary mt-2 text-center">
                  Click to toggle between light and dark
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Animated Toggle</h3>
              </CardHeader>
              <CardBody>
                <div className="flex justify-center">
                  <AnimatedThemeToggle />
                </div>
                <p className="text-sm text-secondary mt-2 text-center">
                  Switch-style animated toggle
                </p>
              </CardBody>
            </Card>
          </div>
        </section>

        {/* Cards Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-primary">Card Components</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Basic Card</h3>
              </CardHeader>
              <CardBody>
                <p className="text-secondary">This is a basic card with header and body.</p>
              </CardBody>
              <CardFooter>
                <Button size="sm">Action</Button>
              </CardFooter>
            </Card>

            <Card elevated>
              <CardBody>
                <h3 className="text-lg font-semibold mb-2">Elevated Card</h3>
                <p className="text-secondary">This card has enhanced shadow and elevation.</p>
              </CardBody>
            </Card>

            <Card interactive onClick={() => alert('Card clicked!')}>
              <CardBody>
                <h3 className="text-lg font-semibold mb-2">Interactive Card</h3>
                <p className="text-secondary">This card is clickable and has hover effects.</p>
              </CardBody>
            </Card>

            <Card severity="critical">
              <CardBody>
                <h3 className="text-lg font-semibold mb-2">Critical Severity</h3>
                <p className="text-secondary">Card with critical severity styling.</p>
              </CardBody>
            </Card>

            <Card severity="high">
              <CardBody>
                <h3 className="text-lg font-semibold mb-2">High Severity</h3>
                <p className="text-secondary">Card with high severity styling.</p>
              </CardBody>
            </Card>

            <Card severity="medium">
              <CardBody>
                <h3 className="text-lg font-semibold mb-2">Medium Severity</h3>
                <p className="text-secondary">Card with medium severity styling.</p>
              </CardBody>
            </Card>
          </div>
        </section>

        {/* Buttons Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-primary">Button Components</h2>
          <Card>
            <CardBody>
              <div className="space-y-6">
                {/* Standard Buttons */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Standard Buttons</h3>
                  <div className="flex flex-wrap gap-4">
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="success">Success</Button>
                    <Button variant="warning">Warning</Button>
                    <Button variant="danger">Danger</Button>
                    <Button variant="ghost">Ghost</Button>
                  </div>
                </div>

                {/* Button Sizes */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Button Sizes</h3>
                  <div className="flex flex-wrap items-center gap-4">
                    <Button size="sm">Small</Button>
                    <Button size="md">Medium</Button>
                    <Button size="lg">Large</Button>
                    <Button size="xl">Extra Large</Button>
                  </div>
                </div>

                {/* Special Buttons */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Special Buttons</h3>
                  <div className="flex flex-wrap gap-4">
                    <LoadingButton 
                      loading={loading} 
                      loadingText="Processing..." 
                      onClick={handleLoadingDemo}
                    >
                      Loading Demo
                    </LoadingButton>
                    <IconButton 
                      icon={<PencilIcon className="w-4 h-4" />} 
                      aria-label="Edit"
                      variant="secondary"
                    />
                    <Button fullWidth className="w-48">Full Width</Button>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* Status Indicators Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-primary">Status & Severity Indicators</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Severity Indicators</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <SeverityIndicator severity="critical" />
                  <SeverityIndicator severity="high" />
                  <SeverityIndicator severity="medium" />
                  <SeverityIndicator severity="low" />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Status Indicators</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <StatusIndicator status="open" />
                  <StatusIndicator status="in_progress" />
                  <StatusIndicator status="resolved" />
                  <StatusIndicator status="closed" />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Priority Badges & Progress</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <PriorityBadge priority={1} />
                    <PriorityBadge priority={2} />
                    <PriorityBadge priority={3} />
                    <PriorityBadge priority={4} />
                    <PriorityBadge priority={5} />
                  </div>
                  <ProgressIndicator percentage={65} />
                </div>
              </CardBody>
            </Card>
          </div>
        </section>

        {/* Modals Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-primary">Modal Components</h2>
          <Card>
            <CardBody>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Standard & Glassmorphism Modals</h3>
                  <div className="flex flex-wrap gap-4">
                    <Button onClick={() => setModalOpen(true)}>
                      Open Standard Modal
                    </Button>
                    <Button onClick={() => setGlassModalOpen(true)} variant="secondary">
                      Open Glassmorphism Modal
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Glassmorphism Cards</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass-card p-6">
                      <h4 className="font-semibold text-primary mb-2">Glass Card Example</h4>
                      <p className="text-secondary">
                        This card uses glassmorphism effects with backdrop blur and transparency.
                        Hover to see the elevation effect.
                      </p>
                    </div>
                    <div className="glass-surface p-6">
                      <h4 className="font-semibold text-primary mb-2">Glass Surface</h4>
                      <p className="text-secondary">
                        A more subtle glassmorphism surface with enhanced visual effects.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Glassmorphism Elements</h3>
                  <div className="flex flex-wrap gap-4 items-center">
                    <button className="glass-button">Glass Button</button>
                    <button className="glass-button">Hover Effect</button>
                    <div className="glass-panel p-4">
                      <span className="text-sm text-primary font-medium">Glass Panel</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* Skeleton Loading Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-primary">Skeleton Loading</h2>
          <Card>
            <CardBody>
              <div className="mb-4">
                <Button 
                  onClick={() => setShowSkeletons(!showSkeletons)}
                  variant={showSkeletons ? "danger" : "primary"}
                >
                  {showSkeletons ? "Hide" : "Show"} Skeleton Loading
                </Button>
              </div>
              
              {showSkeletons && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <SkeletonCard />
                  <SkeletonTable />
                  <SkeletonList />
                </div>
              )}
            </CardBody>
          </Card>
        </section>

        {/* Floating Action Button */}
        <FloatingActionButton 
          icon={<PlusIcon className="w-6 h-6" />}
          onClick={() => alert('FAB clicked!')}
          position="bottom-right"
        />

        {/* Modals */}
        <Modal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)}
          size="md"
        >
          <ModalBody>
            <h3 className="text-lg font-semibold mb-4">Standard Modal</h3>
            <p className="text-secondary">
              This is a standard modal with the default styling. It adapts to the current theme automatically.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setModalOpen(false)}>
              Confirm
            </Button>
          </ModalFooter>
        </Modal>

        <Modal 
          isOpen={glassModalOpen} 
          onClose={() => setGlassModalOpen(false)}
          size="lg"
          glassmorphism
          title="Enhanced Glassmorphism Modal"
        >
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-primary mb-3">✨ Advanced Glass Effects</h4>
              <p className="text-secondary mb-4">
                This modal demonstrates enhanced glassmorphism effects with:
              </p>
              <ul className="list-disc list-inside space-y-2 text-secondary ml-4">
                <li>Advanced backdrop blur with layered transparency</li>
                <li>Smooth entrance and exit animations</li>
                <li>Theme-adaptive glass borders and highlights</li>
                <li>Enhanced visual depth with multi-layer shadows</li>
                <li>Responsive glassmorphism that works in both light and dark modes</li>
              </ul>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-card p-4">
                <h5 className="font-medium text-primary mb-2">🎨 Visual Features</h5>
                <p className="text-sm text-secondary">
                  Subtle highlights, enhanced borders, and smooth hover effects.
                </p>
              </div>
              <div className="glass-card p-4">
                <h5 className="font-medium text-primary mb-2">🚀 Performance</h5>
                <p className="text-sm text-secondary">
                  Hardware-accelerated CSS effects for smooth animations.
                </p>
              </div>
            </div>
          </div>
          
          <ModalFooter glassmorphism>
            <Button variant="ghost" onClick={() => setGlassModalOpen(false)}>
              Close
            </Button>
            <Button variant="primary" onClick={() => setGlassModalOpen(false)}>
              Awesome!
            </Button>
          </ModalFooter>
        </Modal>

        {/* Glassmorphism Showcase Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-primary">🌟 Glassmorphism Showcase</h2>
          <div className="space-y-6">
            <Card>
              <CardBody>
                <p className="text-secondary mb-6">
                  Explore our comprehensive glassmorphism design system with backdrop blur effects, 
                  transparency layers, and enhanced visual depth that adapts beautifully to both light and dark themes.
                </p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Interactive Glass Cards</h3>
                      <div className="space-y-4">
                        <div className="glass-card p-6 cursor-pointer">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-primary">✨ Premium Feature</h4>
                            <div className="glass-panel px-3 py-1">
                              <span className="text-xs font-medium text-primary">NEW</span>
                            </div>
                          </div>
                          <p className="text-secondary text-sm">
                            Advanced glassmorphism card with hover effects and premium styling.
                          </p>
                        </div>
                        
                        <div className="glass-surface p-6">
                          <h4 className="font-semibold text-primary mb-3">🎨 Design System</h4>
                          <p className="text-secondary text-sm mb-4">
                            Consistent glass effects across all components.
                          </p>
                          <div className="flex gap-2">
                            <button className="glass-button text-xs">Action</button>
                            <button className="glass-button text-xs">Secondary</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Glass Elements</h3>
                      <div className="space-y-4">
                        <div className="glass-nav p-4 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-primary">Glass Navigation</span>
                            <div className="flex gap-2">
                              <button className="glass-button text-xs px-2 py-1">Home</button>
                              <button className="glass-button text-xs px-2 py-1">About</button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="glass-panel p-6">
                          <h4 className="font-semibold text-primary mb-2">🚀 Performance</h4>
                          <p className="text-secondary text-sm">
                            Hardware-accelerated CSS with optimized backdrop filters for smooth performance.
                          </p>
                          <div className="mt-4 flex gap-2">
                            <div className="glass-card p-2 text-xs text-center flex-1">
                              <div className="font-medium text-primary">60fps</div>
                              <div className="text-secondary">Smooth</div>
                            </div>
                            <div className="glass-card p-2 text-xs text-center flex-1">
                              <div className="font-medium text-primary">GPU</div>
                              <div className="text-secondary">Accelerated</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default UIShowcase; 