import React, { useState } from 'react';

function App() {
  const [showDetails, setShowDetails] = useState(false);
  const [showPythonDetails, setShowPythonDetails] = useState(false);

  const styles = {
    main: {
      minHeight: '100vh',
      padding: '30px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'Arial',
      backgroundImage:
        "url('https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    },
    navbar: {
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: '10px 0',
      marginBottom: '20px',
      borderRadius: '8px',
    },
    navList: {
      listStyle: 'none',
      display: 'flex',
      gap: '30px',
      margin: 0,
      padding: 0,
    },
    navItem: {
      color: '#fff',
      fontWeight: 'bold',
      cursor: 'pointer',
    },
    card: {
      width: '320px',
      padding: '25px',
      textAlign: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      borderRadius: '16px',
      marginBottom: '20px',
    },
    title: {
      color: '#2bfb70',
    },
    button: {
      padding: '10px 18px',
      backgroundColor: '#5C6AC4',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
    },
  };

  return (
    <div style={styles.main} className='gap-4'>
      {/* Navbar */}
      <nav style={styles.navbar}>
        <ul style={styles.navList}>
          <li style={styles.navItem}>Education</li>
          <li style={styles.navItem}>Links</li>
          <li style={styles.navItem}>Contact</li>
        </ul>
      </nav>

      <div style={styles.card}>
        <h1 className='text-3xl font-bold mb-6'>React JS Course</h1>
        <img
          className='w-40 mx-auto mb-4'
          src='https://imgs.search.brave.com/d15MZ_fPV-6XQonD5OEv84pecGuVYGXCNSV8oyk3A2k/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pY29u/bG9nb3ZlY3Rvci5j/b20vdXBsb2Fkcy9p/bWFnZXMvMjAyNC8x/MC9sZy02NzE1MDZk/NzExMzU0LVJlYWN0/LndlYnA'
          alt='React Logo'
        />
        <p>Learn React from the basics</p>
        <h2 className='font-extrabold text-xl'>Duration: 8 weeks</h2>
        <br />
        <div className='flex gap-2 flex-col'>
          <button
            style={styles.button}
            className='w-full'
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide Syllabus' : 'Show Syllabus'}
          </button>
          <a href='https://react.dev/' target='_blank' rel='noopener noreferrer'>
            <button
              className='w-full bg-cyan-500 p-3 rounded-xl font-bold'
              style={{ cursor: 'pointer' }}
            >
              Visit official page
            </button>
          </a>
        </div>
        {showDetails && (
          <div className='mt-4 font-bold'>
            <p>1. Components & JSX</p>
            <p>2. Work Hard</p>
            <p>3. HTML, CSS, JavaScript</p>
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h1 className='text-3xl font-bold mb-6'>Python Course</h1>
        <img
          className='w-60 mx-auto mb-4'
          src='https://imgs.search.brave.com/H41DUKTjQ2jfrzvhqRnycaaGDYymBdBylOWOtLaDEbY/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93d3cu/bG9nby53aW5lL2Ev/bG9nby9QeXRob25f/KHByb2dyYW1taW5n/X2xhbmd1YWdlKS9Q/eXRob25fKHByb2dy/YW1taW5nX2xhbmd1/YWdlKS1Mb2dvLndp/bmUuc3Zn'
          alt='Python Logo'
        />
        <p>Learn Python from the basics</p>
        <h2 className='font-extrabold text-xl'>Duration: 12 weeks</h2>
        <br />
        <div className='flex gap-2 flex-col'>
          <button
            style={styles.button}
            className='w-full'
            onClick={() => setShowPythonDetails(!showPythonDetails)}
          >
            {showPythonDetails ? 'Hide Syllabus' : 'Show Syllabus'}
          </button>
          <a href='https://python.org/' target='_blank' rel='noopener noreferrer'>
            <button
              className='w-full bg-yellow-500 p-3 rounded-xl font-bold'
              style={{ cursor: 'pointer' }}
            >
              Visit official page
            </button>
          </a>
        </div>
        {showPythonDetails && (
          <div className='mt-4 font-bold'>
            <p>1. Components & JSX</p>
            <p>2. Work Hard</p>
            <p>3. HTML, CSS, JavaScript</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
