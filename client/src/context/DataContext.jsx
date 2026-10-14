import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api, { errMsg } from '../api.js';
import { useAuth } from './AuthContext.jsx';
import { setDateFormat } from '../lib/utils.js';

const DataCtx = createContext(null);
export const useData = () => useContext(DataCtx);

const COLLS = ['contacts', 'leads', 'activities', 'tasks'];
const byNewest = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
const SORT = {
  contacts: byNewest,
  leads: byNewest,
  tasks: byNewest,
  activities: (a, b) => (a.date + a.time).localeCompare(b.date + b.time)
};

function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function DataProvider({ children }) {
  const { user, setUser } = useAuth();
  const [state, setState] = useState({ contacts: [], leads: [], activities: [], tasks: [], team: [], settings: {} });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(null); // { coll, record, preset }
  const [confirmBox, setConfirmBox] = useState(null); // { text, label, onYes }
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef();

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 3200);
  }, []);

  const reload = useCallback(async () => {
    try {
      const [c, l, a, t, team, settings] = await Promise.all([
        api.get('/contacts'), api.get('/leads'), api.get('/activities'), api.get('/tasks'), api.get('/team'), api.get('/settings')
      ]);
      setState({
        contacts: c.data.sort(SORT.contacts), leads: l.data.sort(SORT.leads), activities: a.data.sort(SORT.activities),
        tasks: t.data.sort(SORT.tasks), team: team.data, settings: settings.data
      });
      setLoadError('');
    } catch (e) {
      setLoadError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Apply theme, primary color and date format whenever settings change.
  const appearance = state.settings.appearance || {};
  setDateFormat(appearance.dateFormat); // set before children render so dates use the chosen format
  useEffect(() => {
    const root = document.documentElement;
    if (appearance.theme === 'light' || appearance.theme === 'dark') root.setAttribute('data-theme', appearance.theme);
    else root.removeAttribute('data-theme');
    if (appearance.color && /^#[0-9a-f]{6}$/i.test(appearance.color)) {
      root.style.setProperty('--accent', appearance.color);
      root.style.setProperty('--on-accent', luminance(appearance.color) > 0.45 ? '#111827' : '#FFFFFF');
    } else {
      root.style.removeProperty('--accent');
      root.style.removeProperty('--on-accent');
    }
  }, [appearance.theme, appearance.color]);

  const save = useCallback(async (coll, id, data) => {
    try {
      const res = id ? await api.put(`/${coll}/${id}`, data) : await api.post(`/${coll}`, data);
      const rec = res.data;
      setState((s) => {
        const list = id ? s[coll].map((r) => (r.id === id ? rec : r)) : [rec, ...s[coll]];
        return { ...s, [coll]: [...list].sort(SORT[coll]) };
      });
      return rec;
    } catch (e) {
      toast(errMsg(e));
      return null;
    }
  }, [toast]);

  const remove = useCallback(async (coll, id) => {
    try {
      await api.delete(`/${coll}/${id}`);
      setState((s) => ({ ...s, [coll]: s[coll].filter((r) => r.id !== id) }));
      return true;
    } catch (e) {
      toast(errMsg(e));
      return false;
    }
  }, [toast]);

  const saveSettings = useCallback(async (patch) => {
    try {
      const { data } = await api.put('/settings', patch);
      setState((s) => ({ ...s, settings: data }));
      return true;
    } catch (e) {
      toast(errMsg(e));
      return false;
    }
  }, [toast]);

  const importContacts = useCallback(async (rows) => {
    try {
      const { data } = await api.post('/contacts/import', { rows });
      setState((s) => ({ ...s, contacts: [...data.items, ...s.contacts].sort(SORT.contacts) }));
      return data.imported;
    } catch (e) {
      toast(errMsg(e));
      return 0;
    }
  }, [toast]);

  const setTeam = useCallback((team) => setState((s) => ({ ...s, team })), []);

  const value = useMemo(() => {
    const names = Object.fromEntries(state.team.map((u) => [u.id, u.name]));
    return {
      ...state,
      loading,
      loadError,
      reload,
      save,
      remove,
      saveSettings,
      importContacts,
      setTeam,
      me: user,
      setMe: setUser,
      isAdmin: user && (user.role === 'owner' || user.role === 'admin'),
      userName: (id) => {
        if (id && names[id]) return names[id];
        if (user && (!id || id === user.id)) return user.name;
        return 'Unassigned';
      },
      appearance,
      toast,
      toastMsg,
      form,
      openForm: (coll, record = null, preset = {}) => setForm({ coll, record, preset }),
      closeForm: () => setForm(null),
      confirmBox,
      confirm: (text, label, onYes) => setConfirmBox({ text, label, onYes }),
      closeConfirm: () => setConfirmBox(null)
    };
  }, [state, loading, loadError, reload, save, remove, saveSettings, importContacts, setTeam, user, setUser, appearance, toast, toastMsg, form, confirmBox]);

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export { COLLS };
