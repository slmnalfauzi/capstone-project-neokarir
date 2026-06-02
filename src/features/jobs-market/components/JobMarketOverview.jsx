import React from 'react';
import { Sparkles, CalendarDays, BarChart2, TrendingUp, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../../contexts/LanguageContext';

const JobMarketOverview = ({ predictions, selectedDomain, topDomain, generatedAt, isSimulated }) => {
  const { t, language } = useLanguage();
  
  // Helper to calculate statistics
  const getStats = () => {
    if (!predictions || predictions.length === 0) {
      return {
        topDemandDomain: 'N/A',
        topDemandValue: 0,
        averageGrowth: '0%',
        totalDemand: 0
      };
    }

    const firstMonth = predictions[0];
    const lastMonth = predictions[predictions.length - 1];

    if (selectedDomain === 'all') {
      // 1. Top demand domain in month +1
      let maxDom = 'N/A';
      let maxVal = 0;
      let total = 0;
      
      Object.keys(firstMonth).forEach(dom => {
        const val = firstMonth[dom];
        total += val;
        if (val > maxVal) {
          maxVal = val;
          maxDom = dom;
        }
      });

      // 2. Average growth between Month 1 and Month N across all domains
      let totalGrowthPercent = 0;
      let count = 0;

      Object.keys(firstMonth).forEach(dom => {
        if (lastMonth[dom] && firstMonth[dom]) {
          const growth = ((lastMonth[dom] - firstMonth[dom]) / firstMonth[dom]) * 100;
          totalGrowthPercent += growth;
          count++;
        }
      });

      const rawGrowth = count > 0 ? (totalGrowthPercent / count) : 0;
      const avgGrowth = `${rawGrowth > 0 ? '+' : ''}${rawGrowth.toFixed(1)}%`;

      return {
        topDemandDomain: maxDom,
        topDemandValue: Math.round(maxVal),
        averageGrowth: avgGrowth,
        rawGrowth: rawGrowth,
        totalDemand: Math.round(total)
      };
    } else {
      // For single domain filter
      const valStart = firstMonth[selectedDomain] || 0;
      const valEnd = lastMonth[selectedDomain] || 0;
      const growth = valStart > 0 ? ((valEnd - valStart) / valStart) * 100 : 0;

      return {
        topDemandDomain: selectedDomain,
        topDemandValue: Math.round(valEnd),
        averageGrowth: `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`,
        rawGrowth: growth,
        totalDemand: Math.round(valStart)
      };
    }
  };

  const stats = getStats();
  const isPositiveGrowth = stats.rawGrowth >= 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  const formattedDate = (isoStr) => {
    if (!isoStr) return '-';
    try {
      const date = new Date(isoStr);
      const locale = language === 'en' ? 'en-US' : 'id-ID';
      return date.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
    >
      {/* Card 1: Domain dengan Kebutuhan Tertinggi */}
      <motion.div 
        variants={itemVariants}
        className="bg-pure-surface rounded-[24px] border border-border shadow-sm p-6 relative overflow-hidden transition-all duration-300 hover:shadow-md"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-indigo-50 text-primary rounded-xl">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <span className="text-caption text-secondary-text font-medium bg-canvas-white px-2.5 py-1 rounded-full border border-border/40">
            {t.jobsMarket.maxEstimation}
          </span>
        </div>
        <div>
          <h4 className="text-body-sm font-semibold text-secondary-text mb-1 uppercase tracking-wider">
            {selectedDomain === 'all' ? t.jobsMarket.topTrending : t.jobsMarket.lastMonthEstimation}
          </h4>
          <h2 className="text-title font-bold text-primary-text mb-2 truncate">
            {stats.topDemandDomain}
          </h2>
          <p className="text-caption font-medium text-secondary-text flex items-center gap-1.5 flex-wrap">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-600 font-bold">{t.jobsMarket.activeVacancies(stats.topDemandValue)}</span>
            <span>{t.jobsMarket.jobEstimateSuffix}</span>
          </p>
        </div>
      </motion.div>

      {/* Card 2: Rata-Rata Proyeksi Pertumbuhan */}
      <motion.div 
        variants={itemVariants}
        className="bg-pure-surface rounded-[24px] border border-border shadow-sm p-6 relative overflow-hidden transition-all duration-300 hover:shadow-md"
      >
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-xl ${isPositiveGrowth ? 'bg-emerald-50 text-success' : 'bg-red-50 text-error'}`}>
            <BarChart2 className={`w-6 h-6 ${isPositiveGrowth ? 'text-emerald-600' : 'text-red-600'}`} />
          </div>
          <span className={`text-caption font-semibold px-2.5 py-1 rounded-full border ${isPositiveGrowth ? 'text-emerald-700 bg-emerald-50/60 border-emerald-100' : 'text-red-700 bg-red-50/60 border-red-100'}`}>
            {isPositiveGrowth ? t.jobsMarket.positivePrediction : (language === 'en' ? 'Negative Prediction' : 'Prediksi Menurun')}
          </span>
        </div>
        <div>
          <h4 className="text-body-sm font-semibold text-secondary-text mb-1 uppercase tracking-wider">
            {selectedDomain === 'all' ? t.jobsMarket.averageGrowth : t.jobsMarket.growthTitle(predictions.length)}
          </h4>
          <h2 className={`text-title font-bold mb-2 ${isPositiveGrowth ? 'text-emerald-600' : 'text-red-600'}`}>
            {stats.averageGrowth}
          </h2>
          <p className="text-caption font-medium text-secondary-text flex items-center gap-1">
            {isPositiveGrowth ? t.jobsMarket.growthFooter : (language === 'en' ? 'Projections show a downward trend in IT market demand.' : 'Proyeksi demand pasar kerja IT menunjukkan tren akumulasi menurun.')}
          </p>
        </div>
      </motion.div>

      {/* Card 3: Info Sumber AI Model */}
      <motion.div 
        variants={itemVariants}
        className="bg-pure-surface rounded-[24px] border border-border shadow-sm p-6 relative overflow-hidden transition-all duration-300 hover:shadow-md"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
            <CalendarDays className="w-6 h-6 text-slate-600" />
          </div>
          <span className="text-caption text-secondary-text font-medium bg-canvas-white px-2.5 py-1 rounded-full border border-border/40">
            {t.jobsMarket.dataSource}
          </span>
        </div>
        <div>
          <h4 className="text-body-sm font-semibold text-secondary-text mb-1 uppercase tracking-wider">
            {t.jobsMarket.lastUpdated}
          </h4>
          <h2 className="text-body font-bold text-primary-text mb-2 line-clamp-1">
            {formattedDate(generatedAt)}
          </h2>
          <div className="text-caption font-medium text-secondary-text flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>
              {isSimulated 
                ? t.jobsMarket.simulatedDataDesc
                : t.jobsMarket.realtimeDataDesc}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default JobMarketOverview;
