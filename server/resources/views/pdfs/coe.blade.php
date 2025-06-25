<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Certificate of Employment</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Corinthia&family=Montserrat&display=swap" rel="stylesheet">
    <style>
      @page {
        margin: 0;
      }
      body {
        font-family: Roboto, Sans-serif;
        font-size: 10pt;
        margin: 0;
        padding: 0;
        padding-bottom: 20mm;
      }

      body.template-uni-quest {
        font-family: Montserrat, Sans-serif;
      }

      h1 {
        text-align: center;
        margin-bottom: 30px;
		    font-weight: normal;
		    text-transform: uppercase;
      }

      .header-company-info p,
      .signature-wrapper p {
        margin: 0;
        position: relative;
      }

      .header-company-info p {
        font-size: 9pt;
      }
      #coe-details td {
        padding: 3px;
      }
      .signature-wrapper {
        position: relative;
        padding-top: 10px;
      }
      .signature-wrapper .signature-text {
        font-family: "Corinthia", cursive;
        font-weight: 400;
        font-style: normal;
        font-size: 25pt;
      }
      p.p-highlight {
        margin-top: 30px;
        margin-bottom: 50px;
        background-color: #92c83e;
      }
      footer {
        margin-top: 50px;
        text-align: center;
      }
      a {
        color: #92c83e;
      }
      .template-uni-quest {
        
      }
      .template-uni-quest .content-area {
        margin-top: 0mm;
      }
      .template-uni-quest a {
        color:rgb(235, 128, 29);
      }
      .header-uni-quest {
        margin: 5mm 10mm;
        padding-bottom: 5mm;
        border-bottom: solid 1pt #ff6a13;
      }
      footer {
        position: absolute;
        bottom: -20mm;
        left: 0;
        padding: 5mm;
        text-align: center;
      }
      .header-global {
        background: #16355D;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        padding: 5mm 10mm;
      }
      .header-one-ev {
        background: #ffffff;
        border-bottom: solid 1pt rgb(12, 35, 105);
      }
      .content-area {
        margin-top: 40mm;
        padding: 0 20mm;
      }
    </style>
  </head>
  <body class="template-{{ $coe_template->template_name }}">
    @if($coe_template->template_name == 'uni-quest')
    <div class="header-uni-quest">
      <table style="border-collapse: collapse; width: 100%;" border="0">
        <tbody>
          <tr>
            <td style="width: 350px;">
              <img src="{{ $header_image }}" width="250" />
            </td>
          </tr>
          <tr>
            <td class="header-company-info">
              <p style="text-align: right; margin-bottom: 0;">
                {!! $coe_template->employer_address !!}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    @elseif($coe_template->template_name == 'ev-ph-ortigas')
    <div class="header-global header-one-ev">
      <table style="border-collapse: collapse; width: 100%; " border="0">
        <tbody>
          <tr>
            <td style="width: 350px;">
              <img src="{{ $header_image }}" width="250" />
            </td>
            <td class="header-company-info">
              <p style="text-align: right; margin-bottom: 0;">
                {!! $coe_template->employer_address !!}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    @else
    <div class="header-global">
      <table style="border-collapse: collapse; width: 100%; " border="0">
        <tbody>
          <tr>
            <td style="width: 350px;">
              <img src="{{ $header_image }}" width="250" />
            </td>
            <td class="header-company-info">
              <p style="text-align: right; margin-bottom: 0; color: #fff; font-size: 15pt;">
                Your partner in<br />
                outsourcing success
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    @endif
    <div class="content-area">
      <h1>Certificate of Employment</h1>
      <p><strong>Reference No.: {{ $coe->sequence_number }}</strong></p>
      @if($coe_template->template_name == 'uni-quest')
      <p>This is to certify that the employee whose name and details appear below is an active employee of <strong>{{ $coe_template->employer_entity }}</strong>:</p>
      @else
      <p>This is to certify that the employee whose name and details appear below is an official employee of <strong>{{ $coe_template->employer_entity }}</strong>, a business process outsourcing (BPO) company:</p>
      @endif
      <table id="coe-details" style="border-collapse: collapse;  width: 90%; margin-left: auto; margin-right: auto;" border="1">
        <tbody>
          <tr>
            <td style="width: 200px;">Name</td>
            <td>{{$coe->full_name}}</td>
          </tr>
          <tr>
            <td style="width: 200px;">Residence</td>
            <td>{{$coe->address}}</td>
          </tr>
          <tr>
            <td style="width: 200px;">Hire Date</td>
            <td>{{date_create($coe->hire_date)->format('F d, Y')}}</td>
          </tr>
          @if($coe->separation_date)
          <tr>
            <td style="width: 200px;">Separation Date</td>
            <td>{{date_create($coe->separation_date)->format('F d, Y')}}</td>
          </tr>
          @endif
          <tr>
            <td style="width: 200px;">Job Role</td>
            <td>{{$coe->position}}</td>
          </tr>
          @if($coe->show_compensation)
          <tr>
            <td style="width: 200px;">Basic Salary</td>
            <td>{{$coe->basic_pay}}</td>
          </tr>
            @foreach ($allowances as $allowance)
            <tr>
              <td style="width: 200px;">{{$allowance['label']}}</td>
              <td>{{$allowance['value']}}</td>
            </tr>
            @endforeach
          @endif
          <tr>
            <td style="width: 200px;">Purpose</td>
            <td>{{$coe->purpose}}@if($coe->purpose_note): {{ $coe->purpose_note }}@endif</td>
          </tr>
          <tr>
            <td style="width: 200px;">Date Generated</td>
            <td>{{$coe->created_at->format('F d, Y h:i:s A')}}</td>
          </tr>
        </tbody>
      </table>
      <div class="signature-wrapper">
        <p class="signature-text">{{ $coe_template->signature_file }}</p>
        <p style="margin-top: -10px">
          <strong>{{ $coe_template->signatory_name }}</strong>
        </p>
        <p>{{ $coe_template->signatory_position }}</p>
      </div>
    </div>
    <footer>
      @if($coe_template->template_name == 'uni-quest')
      <p><a href="https://www.uni-quest.co.uk">www.uni-quest.co.uk</a> | <a href="mailto:info@uni-quest.co.uk">info@uni-quest.co.uk</a></p>
      @else
      <p>This is a system generated document.<br />For verification, please send an email to <a href="mailto:happiness@eastvantage.com">happiness@eastvantage.com</a>.</p>
      @endif
    </footer>
  </body>
</html>