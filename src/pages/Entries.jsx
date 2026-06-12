// src/pages/Entries.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';
import { productsService } from '../services/products.service';
import { stockService } from '../services/stock.service';
import QuantityStepper from '../components/ui/QuantityStepper';
import Spinner from '../components/ui/Spinner';

export default function Entries() {
  const { profile, activeCenter } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [products, setProducts] = useState([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchProd, setSearchProd] = useState('');
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const prods = await productsService.list(profile.company_id, activeCenter?.id);
        setProducts(prods);
      } catch (error) {
        toast.error('Erro ao carregar produtos');
      } finally {
        setLoading(false);
      }
    }
    if (profile && activeCenter) load();
  }, [profile, activeCenter]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchProd.toLowerCase()) || 
    (p.ca && p.ca.toLowerCase().includes(searchProd.toLowerCase()))
  );

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await stockService.registerEntry({
        companyId: profile.company_id,
        centerId: activeCenter?.id,
        productId: selectedProduct.id,
        userId: profile.id,
        quantity,
        notes
      });
      toast.success('Entrada registrada com sucesso!');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Erro ao registrar entrada');
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-screen"><Spinner /></div>;

  return (
    <>
      {step === 2 && (
        <button className="back-btn" onClick={() => setStep(1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Voltar
        </button>
      )}

      <h1 className="page-title">Registrar Entrada</h1>
      
      {step === 1 && (
        <>
          <p className="section-subtitle">Selecione o item que será adicionado ao estoque.</p>
          <div className="search-bar">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input 
              type="text" 
              placeholder="Buscar EPI por nome ou CA..." 
              value={searchProd}
              onChange={e => setSearchProd(e.target.value)}
            />
          </div>
          <div className="product-list">
            {filteredProducts.map(p => (
              <div key={p.id} className="product-item" onClick={() => { setSelectedProduct(p); setStep(2); }}>
                <div className="product-item-info">
                  <div className="product-item-name">{p.name}</div>
                  <div className="product-item-meta">CA: {p.ca || 'N/A'} • {p.categories?.name}</div>
                </div>
                <div className="product-item-stock">
                  <div className={`product-item-qty ${p.current_stock === 0 ? 'zero' : ''}`}>{p.current_stock}</div>
                  <div className="product-item-label">em estoque</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {step === 2 && selectedProduct && (
        <>
          <div className="confirm-product-box">
            <div className="name">{selectedProduct.name}</div>
            <div className="meta">CA: {selectedProduct.ca} • Atual: {selectedProduct.current_stock}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Quantidade Adicionada</label>
            <QuantityStepper value={quantity} onChange={setQuantity} min={1} max={99999} />
          </div>

          <div className="form-group">
            <label className="form-label">Nota Fiscal / Fornecedor (opcional)</label>
            <input 
              type="text" 
              className="form-input" 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              placeholder="NF-e 1234..."
            />
          </div>

          <div className="registered-by">
            Será registrado por: <strong>{profile?.name}</strong>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ marginTop: '24px' }} 
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? <Spinner size={24} /> : 'Confirmar Entrada'}
          </button>
        </>
      )}
    </>
  );
}
