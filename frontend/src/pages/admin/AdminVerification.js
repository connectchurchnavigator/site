import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Clock,
  Church,
  User,
  MapPin,
  Eye
} from 'lucide-react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';

const AdminVerification = () => {
  const [data, setData] = useState({ churches: [], pastors: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getPendingVerifications();
      setData(res.data);
    } catch (error) {
      toast.error('Failed to load pending items');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (type, id) => {
    try {
      await adminAPI.approve(type, id);
      toast.success('Listing approved');
      fetchPending();
    } catch (error) {
      toast.error('Failed to approve');
    }
  };

  const handleReject = async (type, id) => {
    const feedback = window.prompt('Enter rejection reason (optional):');
    try {
      await adminAPI.reject(type, id, feedback || '');
      toast.success('Listing rejected');
      fetchPending();
    } catch (error) {
      toast.error('Failed to reject');
    }
  };

  const totalPending = data.churches.length + data.pastors.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Verification Queue</h1>
          <p className="text-slate-600">Review and approve pending listings</p>
        </div>
        <Badge variant={totalPending > 0 ? 'default' : 'secondary'} className="text-lg px-4 py-2">
          <Clock className="h-4 w-4 mr-2" />
          {totalPending} Pending
        </Badge>
      </div>

      {loading ? (
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
          <p className="mt-4 text-slate-500">Loading...</p>
        </Card>
      ) : totalPending === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
          <p className="text-slate-600">No pending listings to review</p>
        </Card>
      ) : (
        <Tabs defaultValue="churches">
          <TabsList>
            <TabsTrigger value="churches" className="flex items-center gap-2">
              <Church className="h-4 w-4" />
              Churches ({data.churches.length})
            </TabsTrigger>
            <TabsTrigger value="pastors" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Pastors ({data.pastors.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="churches" className="space-y-4 mt-4">
            {data.churches.length === 0 ? (
              <Card className="p-8 text-center text-slate-500">
                No churches pending verification
              </Card>
            ) : (
              data.churches.map(church => (
                <Card key={church.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {church.logo ? (
                        <img 
                          src={`${process.env.REACT_APP_BACKEND_URL}${church.logo}`}
                          alt={church.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center text-2xl">
                          ⛪
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">{church.name}</h3>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {church.city}, {church.state}, {church.country}
                        </p>
                        <p className="text-sm text-slate-500">{church.denomination}</p>
                        <p className="text-sm text-slate-500 mt-2">{church.email} • {church.phone}</p>
                        {church.description && (
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2">{church.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <a
                        href={`/church/${church.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand hover:underline text-sm flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </a>
                      <Button onClick={() => handleApprove('church', church.id)} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button variant="destructive" onClick={() => handleReject('church', church.id)}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="pastors" className="space-y-4 mt-4">
            {data.pastors.length === 0 ? (
              <Card className="p-8 text-center text-slate-500">
                No pastors pending verification
              </Card>
            ) : (
              data.pastors.map(pastor => (
                <Card key={pastor.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {pastor.profile_picture ? (
                        <img 
                          src={`${process.env.REACT_APP_BACKEND_URL}${pastor.profile_picture}`}
                          alt={pastor.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-2xl">
                          👤
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">{pastor.name}</h3>
                        <p className="text-sm text-slate-500">{pastor.city}</p>
                        <p className="text-sm text-slate-500">{pastor.denomination}</p>
                        <p className="text-sm text-slate-500 mt-2">{pastor.email} • {pastor.phone}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <a
                        href={`/pastor/${pastor.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand hover:underline text-sm flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </a>
                      <Button onClick={() => handleApprove('pastor', pastor.id)} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button variant="destructive" onClick={() => handleReject('pastor', pastor.id)}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default AdminVerification;
