import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './PlannerReportPage.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'https://api.churchnavigator.com';

function PlannerReportPage() {
  const { trip_id } = useParams();
  const [trip, setTrip] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const shareCardRef = useRef(null);

  useEffect(() => {
    fetchTripAndReport();
  }, [trip_id]);

  const fetchTripAndReport = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const tripRes = await axios.get(`${API_BASE}/api/planner/trips/${trip_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrip(tripRes.data);

      if (tripRes.data.post_trip_report) {
        setReport(tripRes.data.post_trip_report);
      } else {
        const endDate = new Date(tripRes.data.end_date);
        if (new Date() >= endDate) {
          await generateReport();
        } else {
          setError('Trip has not ended yet. Report will be available after the end date.');
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load trip data');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      setGenerating(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_BASE}/api/planner/trips/${trip_id}/report`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReport(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = margin;

    pdf.setFontSize(20);
    pdf.text(trip.name, margin, yPos);
    yPos += 10;

    pdf.setFontSize(12);
    pdf.text(`${trip.city} | ${trip.start_date} to ${trip.end_date}`, margin, yPos);
    yPos += 15;

    pdf.setFontSize(16);
    pdf.text('Trip Summary', margin, yPos);
    yPos += 10;

    pdf.setFontSize(10);
    const analytics = report.analytics;
    pdf.text(`Visits: ${analytics.visits_completed}/${analytics.visits_planned} completed`, margin, yPos);
    yPos += 7;
    pdf.text(`People Reached: ${analytics.attendance_actual.toLocaleString()} (planned: ${analytics.attendance_planned.toLocaleString()})`, margin, yPos);
    yPos += 7;
    pdf.text(`Budget: £${analytics.budget_actual} (estimated: £${analytics.budget_estimated})`, margin, yPos);
    yPos += 7;
    pdf.text(`Re-invitations: ${analytics.reinvitations_count}`, margin, yPos);
    yPos += 15;

    pdf.setFontSize(14);
    pdf.text('AI Insights', margin, yPos);
    yPos += 8;

    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(report.narrative, pageWidth - 2 * margin);
    lines.forEach(line => {
      if (yPos > 270) {
        pdf.addPage();
        yPos = margin;
      }
      pdf.text(line, margin, yPos);
      yPos += 5;
    });

    pdf.save(`${trip.name.replace(/\s+/g, '_')}_Report.pdf`);
  };

  const shareToSocial = async () => {
    if (!shareCardRef.current) return;

    try {
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: '#1a1a2e',
        scale: 2
      });
      canvas.toBlob(blob => {
        const file = new File([blob], 'trip-impact.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          navigator.share({
            files: [file],
            title: 'Ministry Trip Impact',
            text: `${trip.name} - ChurchNavigator`
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'trip-impact.png';
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  if (loading) return <div className="planner-report-loading">Loading trip report...</div>;
  if (error && !report) return <div className="planner-report-error">{error}</div>;
  if (!trip) return <div className="planner-report-error">Trip not found</div>;

  if (!report) {
    return (
      <div className="planner-report-container">
        <div className="planner-report-header">
          <h1>Trip Report Not Yet Available</h1>
          <p>Trip ends on {trip.end_date}. Report will be generated automatically.</p>
          {generating && <p>Generating report...</p>}
        </div>
      </div>
    );
  }

  const { analytics, narrative, reinvitations, suggested_next_trip } = report;
  const completionRate = analytics.visits_planned > 0 ? (analytics.visits_completed / analytics.visits_planned * 100).toFixed(0) : 0;
  const reachRate = analytics.attendance_planned > 0 ? (analytics.attendance_actual / analytics.attendance_planned * 100).toFixed(0) : 0;

  return (
    <div className="planner-report-container">
      <div className="planner-report-header">
        <Link to={`/planner/${trip_id}`} className="back-link">← Back to Trip</Link>
        <h1>{trip.name} - Trip Report</h1>
        <p className="trip-dates">{trip.city} | {trip.start_date} to {trip.end_date}</p>
        <div className="report-actions">
          <button onClick={downloadPDF} className="btn-download">📄 Download PDF</button>
          <button onClick={shareToSocial} className="btn-share">📱 Share Impact</button>
        </div>
      </div>

      <section className="scorecard-section">
        <h2>Trip Summary</h2>
        <div className="scorecard-grid">
          <div className="scorecard-item">
            <div className="scorecard-value">{analytics.visits_completed}/{analytics.visits_planned}</div>
            <div className="scorecard-label">Visits Completed</div>
            <div className="scorecard-progress">
              <div className="progress-bar" style={{ width: `${completionRate}%` }}></div>
            </div>
            <div className="scorecard-percent">{completionRate}%</div>
          </div>

          <div className="scorecard-item">
            <div className="scorecard-value">{analytics.attendance_actual.toLocaleString()}</div>
            <div className="scorecard-label">People Reached</div>
            <div className="scorecard-subtext">Planned: {analytics.attendance_planned.toLocaleString()}</div>
            <div className="scorecard-percent">{reachRate}% of target</div>
          </div>

          <div className="scorecard-item">
            <div className="scorecard-value">{(analytics.total_duration_actual_minutes / 60).toFixed(1)}h</div>
            <div className="scorecard-label">Total Ministry Time</div>
            <div className="scorecard-subtext">Travel: {(analytics.travel_time_planned_minutes / 60).toFixed(1)}h planned</div>
          </div>

          <div className="scorecard-item">
            <div className="scorecard-value">£{analytics.budget_actual}</div>
            <div className="scorecard-label">Actual Budget</div>
            <div className="scorecard-subtext">Estimated: £{analytics.budget_estimated}</div>
            <div className={`scorecard-diff ${analytics.budget_actual <= analytics.budget_estimated ? 'positive' : 'negative'}`}>
              {analytics.budget_actual <= analytics.budget_estimated ? '✓ Under budget' : '⚠ Over budget'}
            </div>
          </div>
        </div>
      </section>

      <section className="visits-breakdown-section">
        <h2>Visit-by-Visit Breakdown</h2>
        <div className="visits-list">
          {trip.visits.map((visit, idx) => (
            <div key={idx} className={`visit-card ${visit.completed ? 'completed' : 'not-completed'}`}>
              <div className="visit-header">
                <h3>{visit.church_name}</h3>
                <span className="visit-status">{visit.completed ? '✓ Completed' : '✗ Not Completed'}</span>
              </div>
              <div className="visit-details">
                <p><strong>Date:</strong> {visit.date} at {visit.time}</p>
                <p><strong>Attendance:</strong> {visit.actual_attendance || 'N/A'} (expected: {visit.expected_attendance || 'N/A'})</p>
                {visit.highlights && <p className="visit-highlights"><strong>Highlights:</strong> {visit.highlights}</p>}
                {visit.reinvitation_received && (
                  <div className="reinvitation-badge">
                    🔁 Re-invitation received
                    {visit.reinvitation_notes && <p>{visit.reinvitation_notes}</p>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="ai-insights-section">
        <h2>AI-Powered Insights</h2>
        <div className="narrative-content" dangerouslySetInnerHTML={{ __html: narrative.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
      </section>

      {reinvitations.length > 0 && (
        <section className="reinvitations-section">
          <h2>Churches That Want You Back</h2>
          <div className="reinvitations-list">
            {reinvitations.map((inv, idx) => (
              <div key={idx} className="reinvitation-card">
                <h3>{inv.church_name}</h3>
                <p>{inv.notes}</p>
                <Link to={`/churches/${inv.church_id}`} className="view-church-link">View Church →</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {suggested_next_trip && (
        <section className="next-trip-section">
          <h2>Suggested Next Trip</h2>
          <div className="next-trip-card">
            <h3>Return to {suggested_next_trip.city}</h3>
            <p><strong>Recommended Date:</strong> {suggested_next_trip.recommended_date}</p>
            {suggested_next_trip.focus_areas.length > 0 && (
              <div>
                <p><strong>Focus on:</strong></p>
                <ul>
                  {suggested_next_trip.focus_areas.map((area, idx) => <li key={idx}>{area}</li>)}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="share-card-section">
        <h2>Share Your Impact</h2>
        <div className="share-card" ref={shareCardRef}>
          <div className="share-card-content">
            <h3>{trip.name}</h3>
            <div className="share-stats">
              <div className="share-stat">
                <div className="stat-number">{analytics.visits_completed}</div>
                <div className="stat-label">Churches Visited</div>
              </div>
              <div className="share-stat">
                <div className="stat-number">{analytics.attendance_actual.toLocaleString()}</div>
                <div className="stat-label">People Reached</div>
              </div>
            </div>
            <p className="share-location">📍 {trip.city}</p>
            <div className="share-footer">
              <span>🙏 ChurchNavigator</span>
            </div>
          </div>
        </div>
        <button onClick={shareToSocial} className="btn-share-card">Share This Card</button>
      </section>
    </div>
  );
}

export default PlannerReportPage;