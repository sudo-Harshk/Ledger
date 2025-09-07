import React from 'react';

const Footer: React.FC = () => (
  <footer className="w-full bg-gray-100 text-gray-600 text-center p-4 text-sm mt-8">
    <p>&copy; {new Date().getFullYear()} Ledger App. All rights reserved.</p>
  </footer>
);

export default Footer;
