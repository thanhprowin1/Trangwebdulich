import React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Tours from './pages/Tours';
import Tours360 from './pages/Tours360';
import Tour360Viewer from './pages/Tour360Viewer';
import TourDetail from './pages/TourDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import MyBookings from './pages/MyBookings';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import Payment from './pages/Payment';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailed from './pages/PaymentFailed';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

// Protected Route Component
const PrivateRoute = ({ component: Component, ...rest }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Route
      {...rest}
      render={props =>
        isAuthenticated ? (
          <Component {...props} />
        ) : (
          <Redirect to="/login" />
        )
      }
    />
  );
};

// Admin-only Route
const AdminRoute = ({ component: Component, ...rest }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) {
    return <div>Loading...</div>;
  }
  return (
    <Route
      {...rest}
      render={props =>
        isAuthenticated && user?.role === 'admin' ? (
          <Component {...props} />
        ) : (
          <Redirect to="/" />
        )
      }
    />
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <main className="app-content">
            <Switch>
              <Route exact path="/" component={Home} />
              <Route exact path="/tours" component={Tours} />
              <Route exact path="/tours-360" component={Tours360} />
              <Route path="/tours-360/:id" component={Tour360Viewer} />
              <Route path="/tours/:id" component={TourDetail} />
              <Route path="/login" component={Login} />
              <Route path="/register" component={Register} />
              <PrivateRoute path="/my-bookings" component={MyBookings} />
              {/* Đặt các route cụ thể TRƯỚC route có parameter để tránh match sai */}
              <Route exact path="/payment/success" component={PaymentSuccess} />
              <Route exact path="/payment/failed" component={PaymentFailed} />
              <PrivateRoute path="/payment/:bookingId" component={Payment} />
              <PrivateRoute path="/profile" component={Profile} />
              <AdminRoute path="/admin" component={AdminDashboard} />
            </Switch>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
