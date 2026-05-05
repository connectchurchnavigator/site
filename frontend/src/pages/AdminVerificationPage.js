import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { CheckCircle, XCircle, Clock, Church as ChurchIcon, User } from 'lucide-react';
import { adminAPI, churchAPI, pastorAPI } from '../lib/api';
import { toast } from 'sonner';

const AdminVerificationPage = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();
  const [pendingChurches, setPendingChurches] = useState([]);
  const [pendingPastors, setPendingPastors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('churches');

  useEffect(() => {
    if (!isSuperAdmin) {
      toast.error('Super Admin access required');
      navigate('/dashboard');
      return;
    }
    fetchPending();
  }, [isSuperAdmin, navigate]);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getPendingVerifications();
      setPendingChurches(res.data.churches || []);
      setPendingPastors(res.data.pastors || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load pending verifications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (type, id, name) => {
    if (!window.confirm(`Approve ${name}?`)) return;

    try {
      await adminAPI.approve(type, id);
      toast.success(`${name} approved!`);
      fetchPending();
    } catch (error) {
      toast.error('Failed to approve: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleReject = async (type, id, name) => {
    const feedback = window.prompt(`Rejection reason for ${name}:`);
    if (!feedback) return;

    try {
      await adminAPI.reject(type, id, feedback);
      toast.success(`${name} rejected`);
      fetchPending();
    } catch (error) {
      toast.error('Failed to reject: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Verification Queue</h1>
          <p className="text-slate-600">Review and approve pending listings</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Pending Churches</p>
                <p className="text-3xl font-bold text-orange-500">{pendingChurches.length}</p>
              </div>
              <ChurchIcon className="h-12 w-12 text-orange-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Pending Pastors</p>
                <p className="text-3xl font-bold text-orange-500">{pendingPastors.length}</p>
              </div>
              <User className="h-12 w-12 text-orange-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Pending</p>
                <p className="text-3xl font-bold text-brand">{pendingChurches.length + pendingPastors.length}</p>
              </div>
              <Clock className="h-12 w-12 text-brand opacity-20" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="churches">Churches ({pendingChurches.length})</TabsTrigger>
            <TabsTrigger value="pastors">Pastors ({pendingPastors.length})</TabsTrigger>
          </TabsList>

          {/* Churches Tab */}
          <TabsContent value="churches">
            {pendingChurches.length > 0 ? (
              <div className="space-y-4">
                {pendingChurches.map((church) => (
                  <Card key={church.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold">{church.name}</h3>
                          <Badge className="bg-orange-500">Pending Verification</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-slate-600">Location</p>
                            <p className="font-medium">{church.city}, {church.state}</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">Denomination</p>
                            <p className="font-medium">{church.denomination || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">Email</p>
                            <p className="font-medium">{church.email}</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">Phone</p>
                            <p className="font-medium">{church.phone}</p>
                          </div>
                        </div>

                        {church.tagline && (
                          <p className="text-slate-600 mb-3">{church.tagline}</p>
                        )}

                        {church.verification_documents?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium mb-2">Verification Documents:</p>
                            <div className="flex flex-wrap gap-2">
                              {church.verification_documents.map((doc, idx) => (
                                <Badge key={idx} variant="outline">{doc}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-slate-500">Submitted: {new Date(church.created_at).toLocaleString()}</p>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          onClick={() => window.open(`/church/${church.slug || church.id}`, '_blank')}
                          variant="outline"
                          size="sm"
                        >
                          Preview
                        </Button>
                        <Button
                          onClick={() => handleApprove('church', church.id, church.name)}
                          className="bg-green-500 hover:bg-green-600 text-white"
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReject('church', church.id, church.name)}
                          variant="destructive"
                          size="sm"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
                <p className="text-slate-600">No pending church verifications</p>
              </Card>
            )}
          </TabsContent>

          {/* Pastors Tab */}
          <TabsContent value="pastors">
            {pendingPastors.length > 0 ? (
              <div className="space-y-4">
                {pendingPastors.map((pastor) => (
                  <Card key={pastor.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold">{pastor.name}</h3>
                          <Badge className="bg-orange-500">Pending Verification</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-slate-600">City</p>
                            <p className="font-medium">{pastor.city}</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">Designation</p>
                            <p className="font-medium">{pastor.current_designation || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">Phone</p>
                            <p className="font-medium">{pastor.phone}</p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">Years in Ministry</p>
                            <p className="font-medium">{pastor.years_in_ministry || 'Not specified'}</p>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500">Submitted: {new Date(pastor.created_at).toLocaleString()}</p>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          onClick={() => window.open(`/pastor/${pastor.slug || pastor.id}`, '_blank')}
                          variant="outline"
                          size="sm"
                        >
                          Preview
                        </Button>
                        <Button
                          onClick={() => handleApprove('pastor', pastor.id, pastor.name)}
                          className="bg-green-500 hover:bg-green-600 text-white"
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReject('pastor', pastor.id, pastor.name)}
                          variant="destructive"
                          size="sm"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
                <p className="text-slate-600">No pending pastor verifications</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default AdminVerificationPage;