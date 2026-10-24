import StreakLogger from '../../components/StreakLogger';

export default function LibraryLayout({ children }) {
  return (
    <>
      <StreakLogger />
      {children}
    </>
  );
}
