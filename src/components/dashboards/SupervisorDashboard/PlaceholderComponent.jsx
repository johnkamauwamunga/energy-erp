import React from 'react';

const PlaceholderComponent = ({ title, icon: Icon }) => (
  <div className="p-6">
    <h3 className="text-2xl font-bold text-gray-900 mb-8">{title}</h3>
    <div className="text-center py-16 text-gray-500">
      <Icon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
      <p>{title} interface coming soon</p>
    </div>
  </div>
);

export default PlaceholderComponent;