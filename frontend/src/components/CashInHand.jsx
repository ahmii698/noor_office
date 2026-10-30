import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FiDollarSign, FiPlus, FiMinus, FiLoader, FiUser, FiClock } from 'react-icons/fi';
import api from '../services/api';

const formatDateTime = (value) => {
  const d = new Date(value);
  if (!value || isNaN(d.getTime())) return '-';
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
};

const rs = (n) => `Rs. ${(Number(n) || 0).toLocaleString()}`;

const CashInHand = ({ darkMode }) => {
  const [balance, setBalance] = useState(0);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [type, setType] = useState('add');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      setIsAdmin(user?.role === 'admin');
    } catch (e) { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/cash-in-hand');
      setBalance(Number(res.data?.balance) || 0);
      setEntries(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error) {
      console.error(error);
      toast.error('Cash in hand load nahi ho saka');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      toast.error('Sahi amount likho');
      return;
    }
    setSaving(true);
    try {
      await api.post('/cash-in-hand', { type, amount: num, note: note.trim() || null });
      toast.success(type === 'add' ? 'Cash add ho gaya!' : 'Cash minus ho gaya!');
      setAmount('');
      setNote('');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update fail hua');
    } finally {
      setSaving(false);
    }
  };

  const card = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm';
  const muted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const strong = darkMode ? 'text-white' : 'text-gray-900';
  const input = `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <FiLoader className="text-4xl text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-xl p-5 border ${card}`}>
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-full bg-cyan-500/15"><FiDollarSign className="text-cyan-400" /></div>
          <span className={`text-xs font-bold ${muted}`}>Admin Cash in Hand (manual)</span>
        </div>
        <p className={`text-2xl font-bold ${strong}`}>{rs(balance)}</p>
        <p className="text-xs font-bold text-gray-500">ye amount Inventory ke "Cash in Hand" card me judti hai</p>
      </div>

      {isAdmin && (
        <form onSubmit={handleSubmit} className={`rounded-xl p-5 border space-y-3 ${card}`}>
          <h3 className={`text-sm font-bold ${strong}`}>Cash Update Karo</h3>
          <div className="flex gap-2">
            <button type="button" onClick={() => setType('add')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${type === 'add' ? 'bg-emerald-500 text-white' : darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
              <FiPlus /> Add
            </button>
            <button type="button" onClick={() => setType('withdraw')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${type === 'withdraw' ? 'bg-red-500 text-white' : darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
              <FiMinus /> Withdraw
            </button>
          </div>
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
            className={input} placeholder="Amount (Rs.) e.g. 50000" disabled={saving} />
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            className={input} placeholder="Note (optional)" maxLength={255} disabled={saving} />
          <button type="submit" disabled={saving}
            className="px-4 py-2 bg-amber-400 text-gray-900 rounded-lg hover:bg-amber-300 transition font-bold flex items-center gap-2 disabled:opacity-60">
            {saving && <FiLoader className="animate-spin" />} Save
          </button>
        </form>
      )}

      <div className={`rounded-xl border overflow-hidden ${card}`}>
        <div className={`px-4 py-3 border-b flex items-center gap-2 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <FiClock className="text-amber-400" />
          <h3 className={`text-sm font-bold ${strong}`}>History</h3>
        </div>
        {entries.length === 0 ? (
          <p className={`p-6 text-center text-sm font-bold ${muted}`}>Abhi tak koi history nahi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                <tr>
                  {['Date & Time', 'Type', 'Amount', 'Pehle', 'Baad me', 'Note', 'By'].map(h => (
                    <th key={h} className={`px-4 py-2 text-left text-xs font-bold uppercase ${muted}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                {entries.map(en => (
                  <tr key={en.id}>
                    <td className={`px-4 py-3 text-xs font-medium ${muted}`}>{formatDateTime(en.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${en.type === 'add' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                        {en.type === 'add' ? 'Added' : 'Withdrawn'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-bold ${en.type === 'add' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {en.type === 'add' ? '+' : '-'}{rs(en.amount)}
                    </td>
                    <td className={`px-4 py-3 font-medium ${muted}`}>{rs(en.balance_before)}</td>
                    <td className={`px-4 py-3 font-bold ${strong}`}>{rs(en.balance_after)}</td>
                    <td className={`px-4 py-3 text-xs font-medium ${muted}`}>{en.note || '-'}</td>
                    <td className={`px-4 py-3 text-xs font-medium ${muted}`}>
                      <span className="flex items-center gap-1"><FiUser /> {en.user_name || '-'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CashInHand;