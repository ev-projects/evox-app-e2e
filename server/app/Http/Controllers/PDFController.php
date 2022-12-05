<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;
use PDF;

class PDFController extends Controller
{
    public function demoGeneratePDF()
    {
        $data = ['title' => 'Welcome to My Blog'];
        $pdf = PDF::loadView('pdfs.coe', $data)->setPaper('a4', 'portrait');

        return $pdf->stream('pdfs.coe.pdf');
    }
}