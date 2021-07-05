import * as Moment from 'moment';
import { extendMoment } from 'moment-range';


var names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

export const getDaysArrayInMonth = function (year, month) {
    var monthIndex = month - 1; // 0..11 instead of 1..12
    
    var date = new Date(year, monthIndex, 1);
    var result = [];
    while (date.getMonth() == monthIndex) {
        result.push(names[monthIndex] + ', ' + date.getDate());
        date.setDate(date.getDate() + 1);
    }
    return result;
}


export const getDaysArrayInWeek = function(startDate, endDate) {
    var date_list = [];
    var dates = [];
    let currDate = Moment(startDate).startOf('day');
    let lastDate = Moment(endDate).startOf('day');
    date_list.push(names[currDate.format('M')-1] +", " + currDate.format('D'))
    dates.push(currDate.format('YYYY')+ "-" + currDate.format('MM') + "-" + currDate.format('DD')  );;
    while(currDate.add(1, 'days').diff(lastDate) < 0) {
        dates.push(currDate.format('YYYY')+ "-" + currDate.format('MM') + "-" + currDate.format('DD')  );
        date_list.push(names[currDate.format('M')-1] +", " + currDate.format('D'));
    }

    date_list.push(names[endDate.format('M')-1] +", " + endDate.format('D'))
    dates.push(lastDate.format('YYYY')+ "-" + lastDate.format('MM') + "-" + lastDate.format('DD')  );

    
    return {date_list:date_list , week_list : ['Sunday',"Saturday"], dates: dates};
};

export const generateWeekList = (year = +Moment().format("YYYY"), month = +Moment().format("MM")) => {
    month = month - 1;
    const moment = extendMoment(Moment);
    const startDate = moment([year, month]);
    const firstDay = moment(startDate).startOf('month')
    const endDay = moment(startDate).endOf('month')
    const monthRange = moment.range(firstDay, endDay)
    const weeks = [];
    const days = Array.from(monthRange.by('day'));
    days.forEach(it => {
        if (!weeks.includes(it.week())) {
            weeks.push(it.week());
        }
    })

    const calendar = []
    weeks.forEach(week => {
        const firstWeekDay = moment([year, month]).week(week).day(0)
        const lastWeekDay = moment([year, month]).week(week).day(6)
        const weekRange = moment.range(firstWeekDay, lastWeekDay)
        calendar.push(Array.from(weekRange.by('day')));
    })

    const week_list = []
    const dates_list = []
    calendar.map((dates) => {
        let list = []
        let date_list = []
        dates.map((date) => {
            if (date.format('M') == month + 1) {
                list.push(date.format('dddd'))
                date_list.push(date)
            }
        })
        week_list.push(list)
        dates_list.push(date_list)
    })

    const final_weeks = []
    week_list.map((day) => {
        final_weeks.push([day[0],day[day.length-1]])
    })
    

    return {week_list:final_weeks , dates_list : dates_list};
}


export const generateWeekListCustom = (start_date, end_date,scope_type) => {
    const moment = extendMoment(Moment);
    const day_range = moment.range(start_date.startOf('day'), end_date.startOf('day'));
    const firstDay = moment(start_date).startOf('day')
    const endDay = moment(end_date).startOf('day')
    const monthRange = moment.range(firstDay, endDay)
    const weeks = [];
    
    const days = Array.from(monthRange.by('day'));
    days.forEach(it => {
        if (!weeks.includes(it.week())) {
            weeks.push(it.week());
        }
    })

    
    const calendar = []
    weeks.forEach(week => {
        const firstWeekDay = start_date.week(week).day(0)
        const lastWeekDay = end_date.week(week).day(6)
        const weekRange = moment.range(firstWeekDay, lastWeekDay)
        calendar.push(Array.from(weekRange.by('day')));

    })

    const week_list = []
    const dates_list = []
    const display_list =[]
    calendar.map((dates) => {
        let list = []
        let date_list = []
        dates.map((date) => {
            if(monthRange.contains(date)){
                list.push(date.format('dddd'))
                date_list.push(date)
                display_list.push(names[date.format('M')-1]+ ", " + date.format('D'))
            }
            
        })
        week_list.push(list)
        dates_list.push(date_list)
    })

    const final_weeks = []
    week_list.map((day) => {
        final_weeks.push([day[0],day[day.length-1]])
    })
    

    return {week_list:final_weeks , dates_list : dates_list , display_list : display_list};
}