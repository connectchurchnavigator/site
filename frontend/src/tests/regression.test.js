import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import WorshipLeadersPage from '../pages/WorshipLeadersPage';
import WorshipLeaderDetail from '../pages/WorshipLeaderDetail';
import MediaTeamsPage from '../pages/MediaTeamsPage';
import MediaTeamDetail from '../pages/MediaTeamDetail';
import EventsPage from '../pages/EventsPage';
import EventDetail from '../pages/EventDetail';
import VisitorRegistration from '../pages/VisitorRegistration';

global.fetch = jest.fn();

const mockWorshipLeader = {
  slug: 'test-leader',
  name: 'John Smith',
  email: 'john@test.com',
  church: 'Test Church',
  styles: ['Contemporary'],
  location: 'London'
};

const mockMediaTeam = {
  slug: 'test-team',
  name: 'Tech Team',
  services: ['Live Streaming'],
  location: 'Manchester'
};

const mockEvent = {
  slug: 'test-event',
  title: 'Test Conference',
  event_type: 'Conference',
  start_date: '2024-12-25T10:00:00',
  location: 'London'
};

const mockChurch = {
  slug: 'test-church',
  name: 'Test Church',
  city: 'London'
};

beforeEach(() => {
  fetch.mockClear();
});

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Worship Leaders Frontend Tests', () => {
  test('worship leaders page loads successfully', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [mockWorshipLeader]
    });

    renderWithRouter(<WorshipLeadersPage />);
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
  });

  test('worship leader detail page loads successfully', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockWorshipLeader
    });

    renderWithRouter(<WorshipLeaderDetail />);
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
  });

  test('worship leader detail shows 404 for invalid slug', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'Not found' })
    });

    renderWithRouter(<WorshipLeaderDetail />);
    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });
  });

  test('worship leaders page filters by location', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [mockWorshipLeader]
    });

    renderWithRouter(<WorshipLeadersPage />);
    const locationFilter = screen.getByLabelText(/location/i);
    fireEvent.change(locationFilter, { target: { value: 'London' } });
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('location=London')
      );
    });
  });
});

describe('Media Teams Frontend Tests', () => {
  test('media teams page loads successfully', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [mockMediaTeam]
    });

    renderWithRouter(<MediaTeamsPage />);
    await waitFor(() => {
      expect(screen.getByText('Tech Team')).toBeInTheDocument();
    });
  });

  test('media team detail page loads successfully', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMediaTeam
    });

    renderWithRouter(<MediaTeamDetail />);
    await waitFor(() => {
      expect(screen.getByText('Tech Team')).toBeInTheDocument();
    });
  });

  test('media team detail shows 404 for invalid slug', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'Not found' })
    });

    renderWithRouter(<MediaTeamDetail />);
    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });
  });
});

describe('Events Frontend Tests', () => {
  test('events page loads successfully', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [mockEvent]
    });

    renderWithRouter(<EventsPage />);
    await waitFor(() => {
      expect(screen.getByText('Test Conference')).toBeInTheDocument();
    });
  });

  test('event detail page loads successfully', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvent
    });

    renderWithRouter(<EventDetail />);
    await waitFor(() => {
      expect(screen.getByText('Test Conference')).toBeInTheDocument();
    });
  });

  test('event detail shows 404 for invalid slug', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'Not found' })
    });

    renderWithRouter(<EventDetail />);
    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });
  });
});

describe('Visitor Registration Frontend Tests', () => {
  test('visitor registration page loads successfully', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockChurch
    });

    renderWithRouter(<VisitorRegistration />);
    await waitFor(() => {
      expect(screen.getByText(/visitor registration/i)).toBeInTheDocument();
    });
  });

  test('visitor form submits successfully', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockChurch
    }).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ message: 'Visitor registered successfully', visitor_id: '123' })
    });

    renderWithRouter(<VisitorRegistration />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@test.com' } });
    fireEvent.click(screen.getByText(/submit/i));

    await waitFor(() => {
      expect(screen.getByText(/successfully registered/i)).toBeInTheDocument();
    });
  });

  test('visitor form shows validation errors for missing fields', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockChurch
    });

    renderWithRouter(<VisitorRegistration />);
    
    await waitFor(() => {
      expect(screen.getByText(/submit/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/submit/i));

    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  test('visitor form shows error for invalid email', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockChurch
    }).mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ detail: 'Invalid email format' })
    });

    renderWithRouter(<VisitorRegistration />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'invalid-email' } });
    fireEvent.click(screen.getByText(/submit/i));

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });
});

describe('Integration Tests', () => {
  test('navigation between pages works correctly', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => [mockWorshipLeader]
    });

    renderWithRouter(<WorshipLeadersPage />);
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    const detailLink = screen.getByText('John Smith');
    fireEvent.click(detailLink);

    await waitFor(() => {
      expect(window.location.pathname).toContain('test-leader');
    });
  });

  test('QR code image loads in visitor registration', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockChurch
    });

    renderWithRouter(<VisitorRegistration />);
    
    await waitFor(() => {
      const qrImage = screen.getByAltText(/qr code/i);
      expect(qrImage).toBeInTheDocument();
      expect(qrImage.src).toContain('test-church');
    });
  });
});