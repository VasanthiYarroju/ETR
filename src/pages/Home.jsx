import React, { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mountain,
  Thermometer,
  Waves,
  Leaf,
  Sprout,
  User,
  X,
  Menu,
  Plus,
  ChevronsDown,
} from 'lucide-react';

// --- Configuration for Sidebar Items ---
const sidebarItems = [
  { id: 'sat-view', icon: <Mountain size={28} />, text: 'Satellite View' },
  { id: 'atmosphere', icon: <Thermometer size={28} />, text: 'Atmosphere' },
  { id: 'oceanary', icon: <Waves size={28} />, text: 'Oceanary' },
  { id: 'agriculture1', icon: <Sprout size={28} />, text: 'Agriculture A' },
  { id: 'agriculture2', icon: <Leaf size={28} />, text: 'Agriculture B' },
];

const forestBarData = [ { id: 1, value: 75 }, { id: 2, value: 50 }, { id: 3, value: 85 }, { id: 4, value: 60 }];

const Homepage = () => {
  const globeEl = useRef();
  const [globeReady, setGlobeReady] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Start open
  const [activeItem, setActiveItem] = useState('atmosphere'); // Set a default active item from your image
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.2;
      globeEl.current.pointOfView({ lat: 20, lng: 20, altitude: 2 }, 0); 
      globeEl.current.controls().enableZoom = false;
    }
  }, [globeReady]);

  // This is the component for a single sidebar item.
  // Creating a sub-component makes the logic much cleaner.
  const SidebarItem = ({ item, isActive, onClick, isOpen }) => {
    const itemStyle = {
      ...styles.menuItem,
      // Apply active background color ONLY if it's the active item
      backgroundColor: isActive ? '#E9E9E9' : 'transparent',
    };
    const iconColor = isActive ? '#212121' : '#FFFFFF';
    const textColor = isActive ? '#212121' : '#FFFFFF';

    return (
      <button style={itemStyle} onClick={onClick}>
        <div style={styles.iconContainer}>
          {React.cloneElement(item.icon, { color: iconColor })}
        </div>
        <AnimatePresence>
          {isOpen && (
            <motion.span
              style={{ ...styles.menuItemText, color: textColor }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              {item.text}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    );
  };

  return (
    <div style={styles.page}>
      <Globe ref={globeEl} globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg" backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png" onGlobeReady={() => setGlobeReady(true)} />
      
      <p style={styles.welcomeText}>"Welcome to the Future of Earth Observation – Data that Speaks for the Planet."</p>
      
      {/* --- CORRECTED Left Sidebar --- */}
      <motion.div
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={styles.sidebar}
      >
        <div style={styles.sidebarHeader}>
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div style={styles.logoContainer} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <Mountain color="#fff" size={32} />
                <span style={styles.logoText}>AwSc-ETR</span>
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.toggleButton}>
            {isSidebarOpen ? <X color="#fff" size={24} /> : <Menu color="#fff" size={28} />}
          </button>
        </div>

        <div style={styles.menuItemsContainer}>
          {sidebarItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              // This isActive prop is the key to fixing the bug. It will be true for ONLY one item.
              isActive={activeItem === item.id}
              onClick={() => setActiveItem(item.id)}
              isOpen={isSidebarOpen}
            />
          ))}
        </div>
      </motion.div>

      {/* --- Widgets, Scroll, and Profile (No Changes) --- */}
      <div style={styles.rightWidgetsContainer}>
        <div style={styles.widget}>
            <svg width="100%" height="90" viewBox="0 0 1000 500" style={{marginBottom: '15px', borderRadius: '10px'}}>
                <path d="M500 0...V100z" fill="#4a4a4a"/>
            </svg>
            <div style={{display: 'flex', gap: '10px'}}>
                <div style={{...styles.pillButton, ...styles.pillButtonActive}}>Locations</div>
                <div style={styles.pillButton}>Data</div>
            </div>
        </div>
        <div style={styles.widget}>
            <div style={styles.widgetHeader}>
                <span style={{fontWeight: 'bold'}}>Forest Cover</span>
                <button style={{background: 'none', border: 'none', cursor: 'pointer'}}><Plus color="#e0e0e0" size={20} /></button>
            </div>
            <svg width="100%" height="80" viewBox="0 0 200 60"><path d="M 0 40 ... L 200 20" stroke="#ff8c66" strokeWidth="2" fill="none" /></svg>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px'}}>
                {forestBarData.map(bar => (<div key={bar.id} style={styles.barBackground}><div style={{...styles.barForeground, width: `${bar.value}%`}}></div></div>))}
            </div>
        </div>
      </div>
      <motion.div style={styles.scrollIndicator} animate={{ y: [0, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}><ChevronsDown color="white" size={28} /></motion.div>
      <div style={styles.profileContainer}>
        <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} style={styles.profileButton}><User color="#333" size={24} /></button>
        <AnimatePresence>
          {isProfileMenuOpen && (<motion.div style={styles.profileMenu} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><div style={styles.profileMenuPointer}></div><a href="#profile" style={styles.profileMenuItem}>Profile</a><a href="#subscription" style={styles.profileMenuItem}>Subscription Status</a><a href="#logout" style={styles.profileMenuItem}>Logout</a></motion.div>)}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- Styles ---
const styles = {
  page: { position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#000000', fontFamily: 'sans-serif', color: 'white' },
  welcomeText: { position: 'absolute', top: '25px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, fontSize: '16px', color: 'rgba(255, 255, 255, 0.8)', textShadow: '0 1px 3px black' },
  sidebar: {
    position: 'absolute', top: '80px', left: '20px', height: 'auto', 
    // --- UPDATED to match your image's dark background ---
    backgroundColor: 'rgba(25, 25, 25, 0.9)', 
    backdropFilter: 'blur(10px)', borderRadius: '25px', padding: '15px 0', display: 'flex', flexDirection: 'column',
    zIndex: 10, boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)', border: '1px solid rgba(255, 255, 255, 0.18)', overflow: 'hidden'
  },
  sidebarHeader: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 15px 0 25px', marginBottom: '20px', minHeight: '44px' },
  toggleButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '10px', zIndex: 2},
  logoContainer: { position: 'absolute', left: '25px', display: 'flex', alignItems: 'center', gap: '12px', color: 'white' },
  logoText: { fontWeight: 'bold', fontSize: '18px', whiteSpace: 'nowrap' },
  menuItemsContainer: { display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 15px' },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: '20px', padding: '0', cursor: 'pointer', height: '52px',
    width: '100%', background: 'none', border: 'none', textAlign: 'left', borderRadius: '12px', transition: 'background-color 0.2s',
  },
  iconContainer: { minWidth: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center'},
  menuItemText: { fontSize: '16px', whiteSpace: 'nowrap', fontWeight: '500' },
  rightWidgetsContainer: { position: 'absolute', top: '15vh', right: '20px', width: '280px', display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 10 },
  widget: { backgroundColor: 'rgba(25, 25, 25, 0.8)', backdropFilter: 'blur(10px)', borderRadius: '25px', padding: '20px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)', border: '1px solid rgba(255, 255, 255, 0.18)' },
  widgetHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  pillButton: { flex: 1, padding: '8px 12px', borderRadius: '20px', textAlign: 'center', fontSize: '14px', cursor: 'pointer', border: '1px solid #888', color: '#ccc' },
  pillButtonActive: { backgroundColor: '#ff7f50', border: '1px solid #ff7f50', color: 'white', fontWeight: 'bold' },
  barBackground: { width: '100%', height: '10px', backgroundColor: '#555', borderRadius: '5px' },
  barForeground: { height: '100%', borderRadius: '5px', backgroundColor: '#f0a080' },
  scrollIndicator: { position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 },
  profileContainer: { position: 'absolute', top: '20px', right: '20px', zIndex: 20 },
  profileButton: { width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#ffffff', border: '2px solid #a0a0a0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' },
  profileMenu: { position: 'absolute', top: '65px', right: '0', width: '200px', backgroundColor: 'rgba(43, 43, 43, 0.9)', backdropFilter: 'blur(10px)', borderRadius: '15px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)', border: '1px solid rgba(255, 255, 255, 0.18)' },
  profileMenuPointer: { position: 'absolute', top: '-10px', right: '15px', width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: '10px solid rgba(43, 43, 43, 0.9)' },
  profileMenuItem: { padding: '10px 15px', color: 'white', textDecoration: 'none', borderRadius: '8px', fontSize: '14px', transition: 'background-color 0.2s' },
};

export default Homepage;