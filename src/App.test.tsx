import { render, screen } from '@testing-library/react';
import App from './App';

test('renders header or some text', () => {
  render(<App />);
  // Adjust this to match your actual rendered text
  const headerText = screen.getByText(/Home Page/i);
  expect(headerText).toBeInTheDocument();
});