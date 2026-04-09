import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left – branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 flex-col justify-between p-12 text-white">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl font-bold">F</div>
            <span className="text-2xl font-bold">FinTrack</span>
          </div>
        </div>

        <div>
          <blockquote className="text-2xl font-light leading-relaxed mb-8">
            "Take control of your finances. Track every dollar, cancel what you don't use, and hit your goals."
          </blockquote>
          <div className="grid grid-cols-3 gap-6">
            {[
              { value: '$2.4K', label: 'Avg monthly savings' },
              { value: '94%', label: 'User satisfaction' },
              { value: '50K+', label: 'Active users' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-white/70 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/50 text-sm">
          © {new Date().getFullYear()} FinTrack. All rights reserved.
        </p>
      </div>

      {/* Right – form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold">F</div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">FinTrack</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
