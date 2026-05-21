<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Invoice;
use App\Models\Expense;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function stats()
    {
        $totalSales = Invoice::sum('total_amount');
        $totalExpenses = Expense::sum('amount');
        $totalProfit = $totalSales - $totalExpenses;
        $totalProducts = Product::count();
        $totalStock = Product::sum('quantity');
        
        $paidInvoices = Invoice::where('status', 'Paid')->count();
        $partialInvoices = Invoice::where('status', 'Partial')->count();
        $pendingInvoices = Invoice::where('status', 'Pending')->count();

        return response()->json([
            'totalSales' => $totalSales,
            'totalExpenses' => $totalExpenses,
            'totalProfit' => $totalProfit,
            'profitMargin' => $totalSales > 0 ? ($totalProfit / $totalSales) * 100 : 0,
            'totalProducts' => $totalProducts,
            'totalStock' => $totalStock,
            'paidInvoices' => $paidInvoices,
            'partialInvoices' => $partialInvoices,
            'pendingInvoices' => $pendingInvoices
        ]);
    }

    public function recentInvoices()
    {
        $invoices = Invoice::with('items')->orderBy('id', 'desc')->limit(5)->get();
        return response()->json($invoices);
    }

    public function lowStockProducts()
    {
        $products = Product::where('quantity', '<', 10)->get();
        return response()->json($products);
    }
}