import React from 'react';

const ProfilePage: React.FC = () => {
  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <section style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1>Profile</h1>
        <p>Welcome to your profile page. This is a basic TypeScript React component.</p>
        <div style={{ marginTop: '1.5rem', padding: '1rem', border: '1px solid #ddd', borderRadius: 8 }}>
          <h2>Account Details</h2>
          <ul>
            <li>Name: Jane Doe</li>
            <li>Email: jane.doe@example.com</li>
            <li>Member since: January 2024</li>
          </ul>
        </div>
      </section>
    </main>
  );
};

export default ProfilePage;
