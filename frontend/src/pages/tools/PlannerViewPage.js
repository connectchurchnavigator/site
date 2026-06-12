import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './PlannerViewPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const ITEM_ICONS = {
  'airport': '✈️',
  'transport': '🚗',
  'accommodation': '🏨',
  'church': '⛪',
  'meeting': '👤',
  'event': '🎤',
  'meal': '🍽️',
  'break': '☕'
};

const PlannerViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    fetchPlan();
  }, [id]);

  const fetchPlan = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/planner/${id}`);
      setPlan(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const response = await axios.post(`${API_URL}/api/planner/${id}/optimize`);
      setPlan(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to optimize plan');
    } finally {
      setOptimizing(false);
    }
  };

  const handleSave = async () => {
    try {
      await axios.put(`${API_URL}/api/planner/${id}`, plan);
      setEditMode(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save plan');
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/planner/${id}`;
    setShareUrl(url);
    navigator.clipboard.writeText(url);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    
    const dayIndex = parseInt(result.source.droppableId.split('-')[1]);
    const items = Array.from(plan.days[dayIndex].items);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    const newPlan = { ...plan };
    newPlan.days[dayIndex].items = items;
    setPlan(newPlan);
  };

  const removeItem = (dayIndex, itemIndex) => {
    const newPlan = { ...plan };
    newPlan.days[dayIndex].items.splice(itemIndex, 1);
    setPlan(newPlan);
  };

  const getFeasibilityColor = (score) => {
    if (score >= 80) return '#48bb78';
    if (score >= 60) return '#ed8936';
    return '#f56565';
  };

  if (loading) {
    return (
      <div className="planner-view-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading plan...</p>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="planner-view-page">
        <div className="error-container">
          <h2>Error Loading Plan</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => navigate('/planner/new')}>
            Create New Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="planner-view-page">
      <div className="planner-view-container">
        <div className="planner-view-header">
          <div>
            <h1>🗓️ {plan.title}</h1>
            <p className="plan-subtitle">{plan.visitor} • {plan.location} • {plan.dates}</p>
          </div>
          <div className="header-actions">
            {editMode ? (
              <>
                <button className="btn-secondary" onClick={() => setEditMode(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleSave}>Save Changes</button>
              </>
            ) : (
              <>
                <button className="btn-secondary" onClick={() => setEditMode(true)}>Edit</button>
                <button className="btn-primary" onClick={handleShare}>Share</button>
              </>
            )}
          </div>
        </div>

        {shareUrl && (
          <div className="share-notification">
            ✅ Link copied! Share: <a href={shareUrl}>{shareUrl}</a>
          </div>
        )}

        <div className="planner-view-content">
          <div className="itinerary-section">
            <DragDropContext onDragEnd={onDragEnd}>
              {plan.days.map((day, dayIndex) => (
                <div key={dayIndex} className={`day-card ${day.overloaded ? 'overloaded' : ''}`}>
                  <div className="day-header">
                    <div>
                      <h2>Day {day.number} — {day.date}</h2>
                      <span className="day-meta">{day.dayOfWeek} • {day.totalHours}hrs</span>
                    </div>
                    {day.overloaded && (
                      <div className="day-warning">
                        ⚠️ Overloaded ({day.totalHours}hrs)
                      </div>
                    )}
                  </div>

                  <Droppable droppableId={`day-${dayIndex}`} isDropDisabled={!editMode}>
                    {(provided, snapshot) => (
                      <div
                        className={`day-timeline ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        {day.items.map((item, itemIndex) => (
                          <Draggable
                            key={`${dayIndex}-${itemIndex}`}
                            draggableId={`${dayIndex}-${itemIndex}`}
                            index={itemIndex}
                            isDragDisabled={!editMode}
                          >
                            {(provided, snapshot) => (
                              <div
                                className={`timeline-item ${snapshot.isDragging ? 'dragging' : ''}`}
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <div className="item-time">{item.time}</div>
                                <div className="item-icon">{ITEM_ICONS[item.type] || '📍'}</div>
                                <div className="item-content">
                                  <div className="item-title">{item.title}</div>
                                  <div className="item-location">{item.location}</div>
                                  {item.travelTime && (
                                    <div className="item-travel">🚗 {item.travelTime} to next</div>
                                  )}
                                </div>
                                {editMode && (
                                  <button
                                    className="item-remove"
                                    onClick={() => removeItem(dayIndex, itemIndex)}
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </DragDropContext>
          </div>

          <div className="feasibility-panel">
            <h3>Feasibility Analysis</h3>
            <div className="feasibility-score">
              <div
                className="score-circle"
                style={{ borderColor: getFeasibilityColor(plan.feasibility.score) }}
              >
                <span className="score-number">{plan.feasibility.score}</span>
                <span className="score-label">/ 100</span>
              </div>
            </div>

            <div className="feasibility-items">
              {plan.feasibility.items.map((item, index) => (
                <div key={index} className={`feasibility-item ${item.status}`}>
                  <span className="feasibility-icon">
                    {item.status === 'success' ? '✅' : item.status === 'warning' ? '⚠️' : '💡'}
                  </span>
                  <span className="feasibility-text">{item.text}</span>
                </div>
              ))}
            </div>

            <button
              className="btn-optimize"
              onClick={handleOptimize}
              disabled={optimizing}
            >
              {optimizing ? 'Optimizing...' : '🤖 Optimize Plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlannerViewPage;