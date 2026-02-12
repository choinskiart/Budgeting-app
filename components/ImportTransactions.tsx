import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBudget } from '../context/BudgetContext';
import { ParsedTransaction } from '../types';
import { ArrowLeft, Upload, FileText, Check, X, AlertCircle, HelpCircle, Loader2 } from 'lucide-react';
import { CategoryIcon } from './ui/CategoryIcon';
import { CURRENCY_FORMATTER } from '../constants';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path for PDF.js - use unpkg as fallback
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const ImportTransactions: React.FC = () => {
  const navigate = useNavigate();
  const { state, addMultipleTransactions, saveMerchantMapping, findCategoryForMerchant } = useBudget();

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needsManualReview, setNeedsManualReview] = useState<string[]>([]);

  // Parse date from Polish format (DD.MM.YYYY or DD-MM-YYYY)
  const parseDate = (dateStr: string): string | null => {
    const match = dateStr.match(/(\d{2})[.\-/](\d{2})[.\-/](\d{4})/);
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${month}-${day}`;
    }
    return null;
  };

  // Parse amount from Polish format (1 234,56 or 1234.56)
  const parseAmount = (amountStr: string): number | null => {
    // Remove spaces and replace comma with dot
    const cleaned = amountStr.replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : Math.abs(num);
  };

  // Extract transactions from PDF text
  const parseTransactionsFromText = (text: string): ParsedTransaction[] => {
    const transactions: ParsedTransaction[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Common patterns for Polish bank statements
    // Pattern: DATE DESCRIPTION AMOUNT
    const transactionPatterns = [
      // mBank, ING, Santander style: DD.MM.YYYY Description -123,45
      /(\d{2}[.\-]\d{2}[.\-]\d{4})\s+(.+?)\s+(-?\d[\d\s]*[,.]?\d*)\s*(?:PLN|zł)?$/i,
      // Alternative: Description DATE AMOUNT
      /(.+?)\s+(\d{2}[.\-]\d{2}[.\-]\d{4})\s+(-?\d[\d\s]*[,.]?\d*)\s*(?:PLN|zł)?$/i,
    ];

    for (const line of lines) {
      for (const pattern of transactionPatterns) {
        const match = line.match(pattern);
        if (match) {
          let dateStr: string, description: string, amountStr: string;

          if (match[1].match(/\d{2}[.\-]\d{2}[.\-]\d{4}/)) {
            // First pattern: date first
            dateStr = match[1];
            description = match[2];
            amountStr = match[3];
          } else {
            // Second pattern: description first
            description = match[1];
            dateStr = match[2];
            amountStr = match[3];
          }

          const date = parseDate(dateStr);
          const amount = parseAmount(amountStr);

          if (date && amount && amount > 0) {
            // Try to find category for this merchant
            const suggestedCategoryId = findCategoryForMerchant(description);

            transactions.push({
              id: crypto.randomUUID(),
              date,
              description: description.trim(),
              merchant: extractMerchantName(description),
              amount,
              suggestedCategoryId,
              isAutoMatched: suggestedCategoryId !== null,
              selected: true,
            });
          }
          break;
        }
      }
    }

    return transactions;
  };

  // Extract merchant name from description (simplified)
  const extractMerchantName = (description: string): string => {
    // Remove common prefixes like "PRZELEW", "ZAKUP", "PŁATNOŚĆ"
    let cleaned = description
      .replace(/^(PRZELEW|ZAKUP|PŁATNOŚĆ|WYPŁATA|WPŁATA|TRANSAKCJA)\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Take first meaningful part (before numbers or dates)
    const parts = cleaned.split(/\s+\d/)[0];
    return parts.substring(0, 50).trim() || description.substring(0, 50);
  };

  // Process PDF file
  const processPDF = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setParsedTransactions([]);
    setNeedsManualReview([]);

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Try loading PDF with worker disabled as fallback
      let pdf;
      try {
        pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      } catch (workerError) {
        console.warn('Worker failed, trying without worker:', workerError);
        // Retry without worker
        pdf = await pdfjsLib.getDocument({
          data: arrayBuffer,
          useWorkerFetch: false,
          isEvalSupported: false,
          useSystemFonts: true,
        }).promise;
      }

      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      console.log('Extracted PDF text:', fullText.substring(0, 1000)); // Debug log

      const transactions = parseTransactionsFromText(fullText);

      if (transactions.length === 0) {
        setError('Nie znaleziono transakcji w tym pliku PDF. Spróbuj wyeksportować wyciąg w innym formacie lub skontaktuj się ze mną.');
        console.log('Full extracted text:', fullText); // Debug log
      } else {
        setParsedTransactions(transactions);

        // Find transactions that need manual review
        const needsReview = transactions
          .filter(t => !t.suggestedCategoryId)
          .map(t => t.id);
        setNeedsManualReview(needsReview);
      }
    } catch (err: any) {
      console.error('PDF parsing error:', err);
      if (err.message?.includes('password')) {
        setError('Plik PDF jest zabezpieczony hasłem. Usuń hasło przed importem.');
      } else if (err.message?.includes('Invalid')) {
        setError('Nieprawidłowy format pliku PDF. Spróbuj pobrać wyciąg ponownie.');
      } else {
        setError(`Błąd podczas przetwarzania: ${err.message || 'nieznany błąd'}. Sprawdź konsolę przeglądarki (F12) po więcej szczegółów.`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      processPDF(files[0]);
    } else {
      setError('Proszę przesłać plik PDF');
    }
  }, []);

  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processPDF(files[0]);
    }
  };

  // Toggle transaction selection
  const toggleTransaction = (id: string) => {
    setParsedTransactions(prev =>
      prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t)
    );
  };

  // Change category for a transaction
  const changeCategory = (id: string, categoryId: string) => {
    setParsedTransactions(prev =>
      prev.map(t => {
        if (t.id === id) {
          return {
            ...t,
            suggestedCategoryId: categoryId,
            isAutoMatched: false, // Mark as manually set
          };
        }
        return t;
      })
    );

    // Remove from needs review if it was there
    setNeedsManualReview(prev => prev.filter(tid => tid !== id));
  };

  // Import selected transactions
  const handleImport = async () => {
    const selectedTx = parsedTransactions.filter(t => t.selected && t.suggestedCategoryId);

    if (selectedTx.length === 0) {
      setError('Wybierz przynajmniej jedną transakcję z przypisaną kategorią');
      return;
    }

    setIsProcessing(true);

    try {
      // Save merchant mappings for manually categorized transactions
      for (const tx of selectedTx) {
        if (!tx.isAutoMatched && tx.suggestedCategoryId) {
          await saveMerchantMapping({
            pattern: tx.merchant.toLowerCase().substring(0, 30),
            categoryId: tx.suggestedCategoryId,
            merchantName: tx.merchant,
          });
        }
      }

      // Add transactions
      const transactionsToAdd = selectedTx.map(tx => ({
        amount: tx.amount,
        categoryId: tx.suggestedCategoryId!,
        date: tx.date,
        note: tx.description.substring(0, 100),
        createdBy: 'Artur' as const, // Default, can be changed
      }));

      await addMultipleTransactions(transactionsToAdd);

      navigate('/');
    } catch (err) {
      console.error('Import error:', err);
      setError('Błąd podczas importowania transakcji');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedCount = parsedTransactions.filter(t => t.selected).length;
  const uncategorizedCount = parsedTransactions.filter(t => t.selected && !t.suggestedCategoryId).length;

  return (
    <div className="min-h-screen bg-white md:bg-neutral-50 md:py-8 flex flex-col items-center">
      <div className="w-full md:max-w-4xl md:mx-auto bg-white md:rounded-3xl md:shadow-xl md:border md:border-neutral-100 overflow-hidden flex flex-col h-full md:h-auto">

        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-4 sticky top-0 bg-white z-20">
          <button onClick={() => navigate(-1)} className="text-neutral-500 hover:text-neutral-800 transition-colors p-2 -ml-2 rounded-full hover:bg-neutral-50">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="font-medium text-neutral-800 leading-tight text-lg">Import z PDF</h1>
            <p className="text-xs text-neutral-400">Wgraj wyciąg bankowy</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Upload area */}
          {parsedTransactions.length === 0 && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                isDragging
                  ? 'border-calm-blue bg-calm-blue/5'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 size={48} className="animate-spin text-calm-blue" />
                  <p className="text-neutral-600">Przetwarzanie pliku...</p>
                </div>
              ) : (
                <>
                  <Upload size={48} className="mx-auto mb-4 text-neutral-300" />
                  <p className="text-neutral-600 mb-2">Przeciągnij plik PDF tutaj</p>
                  <p className="text-sm text-neutral-400 mb-4">lub</p>
                  <label className="inline-block px-6 py-3 bg-calm-blue text-white rounded-xl font-medium cursor-pointer hover:bg-indigo-700 transition-colors">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    Wybierz plik
                  </label>
                </>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          {/* Manual review warning */}
          {needsManualReview.length > 0 && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium">
                  {needsManualReview.length} transakcji wymaga ręcznego przypisania kategorii
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Kliknij na kategorię aby ją zmienić. System zapamięta Twój wybór na przyszłość.
                </p>
              </div>
            </div>
          )}

          {/* Parsed transactions */}
          {parsedTransactions.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-medium text-neutral-800">
                  Znalezione transakcje ({parsedTransactions.length})
                </h2>
                <span className="text-sm text-neutral-500">
                  Zaznaczono: {selectedCount}
                </span>
              </div>

              {parsedTransactions.map(tx => (
                <div
                  key={tx.id}
                  className={`p-4 rounded-xl border transition-all ${
                    tx.selected
                      ? 'bg-white border-neutral-200 shadow-sm'
                      : 'bg-neutral-50 border-neutral-100 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTransaction(tx.id)}
                      className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        tx.selected
                          ? 'bg-calm-blue border-calm-blue text-white'
                          : 'border-neutral-300'
                      }`}
                    >
                      {tx.selected && <Check size={14} />}
                    </button>

                    {/* Transaction info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-800 truncate">{tx.merchant}</p>
                          <p className="text-xs text-neutral-500 truncate">{tx.description}</p>
                          <p className="text-xs text-neutral-400 mt-1">{tx.date}</p>
                        </div>
                        <span className="font-semibold text-neutral-800 whitespace-nowrap">
                          {CURRENCY_FORMATTER.format(tx.amount)}
                        </span>
                      </div>

                      {/* Category selector */}
                      {tx.selected && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {state.categories.filter(c => c.id !== 'savings').map(cat => (
                            <button
                              key={cat.id}
                              onClick={() => changeCategory(tx.id, cat.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                                tx.suggestedCategoryId === cat.id
                                  ? 'bg-calm-blue text-white'
                                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                              }`}
                            >
                              <CategoryIcon icon={cat.icon} size={14} />
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Auto-match indicator */}
                      {tx.isAutoMatched && tx.suggestedCategoryId && (
                        <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                          <Check size={12} />
                          Automatycznie przypisano na podstawie poprzednich wyborów
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        {parsedTransactions.length > 0 && (
          <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-neutral-600">
                {uncategorizedCount > 0 ? (
                  <span className="text-amber-600">
                    {uncategorizedCount} bez kategorii
                  </span>
                ) : (
                  <span className="text-emerald-600">
                    Wszystkie skategoryzowane
                  </span>
                )}
              </div>

              <button
                onClick={handleImport}
                disabled={isProcessing || selectedCount === 0}
                className="px-8 py-3 bg-neutral-900 text-white rounded-xl font-semibold hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <FileText size={18} />
                )}
                Importuj {selectedCount} transakcji
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportTransactions;
