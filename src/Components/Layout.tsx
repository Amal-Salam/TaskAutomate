/* eslint-disable prettier/prettier */
import NavSidebar from "./NavSideBar";
import AIIntelligenceBar from "./AIBar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <NavSidebar />
      <div className="flex-1 flex flex-col ml-16 sm:ml-64">
        <AIIntelligenceBar />
        <main className="flex-1 p-4 sm:p-6 bg-offwhite dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}